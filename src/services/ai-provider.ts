import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/lib/supabase";
import { z } from "zod";
import process from "node:process";

// 1. Server-side handler (runs ONLY on the server backend)
// This serves as a secure fallback if the Supabase Edge Function is not deployed/configured.
export const callGeminiServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      message: z.string(),
      conversationId: z.string().optional(),
      userToken: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const { message, conversationId, userToken } = data;
    const geminiApiKey = process.env.GEMINI_API_KEY || "";

    if (!geminiApiKey) {
      return {
        response:
          "EcoAI is currently offline. Please set your GEMINI_API_KEY in the server .env configuration to enable the coach.",
        conversationId: conversationId || "offline-fallback",
      };
    }

    try {
      // Initialize Supabase admin client on server
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing server-side Supabase credentials.");
      }

      // We need to create a server-side client to verify token and fetch user stats
      const { createClient } = await import("@supabase/supabase-js");
      const serverSupabase = createClient(supabaseUrl, supabaseServiceKey);

      // Verify user token
      const {
        data: { user },
        error: authError,
      } = await serverSupabase.auth.getUser(userToken);
      if (authError || !user) {
        throw new Error("Unauthorized access in server fallback.");
      }

      // Query User Context
      const { data: profile } = await serverSupabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      const { data: carbonProfile } = await serverSupabase
        .from("carbon_profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      const { data: goals } = await serverSupabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active");
      const { data: userChallenges } = await serverSupabase
        .from("user_challenges")
        .select("progress, challenges(*)")
        .eq("user_id", user.id)
        .eq("status", "joined");
      const { data: footprintRecords } = await serverSupabase
        .from("footprint_records")
        .select("*")
        .eq("user_id", user.id)
        .order("record_date", { ascending: false })
        .limit(5);
      const { data: simulations } = await serverSupabase
        .from("simulations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);

      // Manage Conversation
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        console.log("Server fallback: Creating new conversation for user:", user.id);
        const { data: newConv, error: convError } = await serverSupabase
          .from("ai_conversations")
          .insert({ user_id: user.id, title: message.substring(0, 40) })
          .select()
          .single();

        if (convError) {
          console.error("Server fallback: FAILED to create conversation in Supabase:", convError);
          throw new Error(`Failed to create conversation: ${convError.message}`);
        }
        if (!newConv) {
          console.error("Server fallback: Conversation insert returned no data");
          throw new Error("Failed to create conversation: insert returned no data");
        }
        activeConversationId = newConv.id;
        console.log(
          "Server fallback: Created conversation successfully with ID:",
          activeConversationId,
        );
      }

      // Save user message
      console.log("Server fallback: Saving user message for conversation:", activeConversationId);
      const { error: userMsgError } = await serverSupabase.from("ai_messages").insert({
        conversation_id: activeConversationId,
        role: "user",
        content: message,
      });

      if (userMsgError) {
        console.error("Server fallback: FAILED to save user message:", userMsgError);
        throw new Error(`Failed to save user message: ${userMsgError.message}`);
      }

      // Query history
      const { data: history, error: historyError } = await serverSupabase
        .from("ai_messages")
        .select("role, content")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true })
        .limit(10);

      if (historyError) {
        console.error("Server fallback: FAILED to load history:", historyError);
        throw new Error(`Failed to load history: ${historyError.message}`);
      }

      // Assemble system instruction prompt
      const systemPrompt = `You are EcoAI, a world-class sustainability coach and environmental scientist integrated into CarbonLens AI.
Personalized User Stats:
- User Name: ${profile?.name ?? "CarbonLens Member"}
- XP: ${profile?.xp_points ?? 0} (Level ${profile?.level ?? 1})
- Sustainability Score: ${profile?.sustainability_score ?? 70}/100
- Offset Trees: ${profile?.trees_planted ?? 0}
- Transit: ${carbonProfile?.transportation_type ?? "Car (solo)"} (${carbonProfile?.weekly_distance ?? 150} km/week)
- Household Energy: ${carbonProfile?.energy_type ?? "Mixed grid"}
- Food Diet: ${carbonProfile?.food_diet ?? "Mixed meat/veg"}
- Recycling: ${carbonProfile?.waste_recycling ?? "Some recycling"}

Active Goals:
${goals && goals.length > 0 ? goals.map((g) => `- ${g.title} (${g.category}): target ${g.target_value}, current progress ${g.progress_value}`).join("\n") : "None."}

Active Challenges:
${userChallenges && userChallenges.length > 0 ? userChallenges.map((uc) => `- ${(uc.challenges as any)?.title}: progress ${uc.progress}%`).join("\n") : "None."}

Recent Footprint Records (kg CO2):
${footprintRecords && footprintRecords.length > 0 ? footprintRecords.map((r) => `- ${r.record_date}: Total ${r.total_emissions} kg`).join("\n") : "No records."}

Recent Simulations Saved:
${simulations && simulations.length > 0 ? simulations.map((s) => `- Savings: ${s.annual_savings} kg/year (${s.percentage_reduction}%)`).join("\n") : "None."}

Provide highly focused, encouraging, and scientifically sound advice. Avoid generic answers. Format output in Markdown.`;

      const contents = [];
      if (history && history.length > 0) {
        for (const msg of history) {
          contents.push({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
          });
        }
      } else {
        contents.push({
          role: "user",
          parts: [{ text: message }],
        });
      }

      // Call Gemini 2.5 Flash
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
      const geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
        }),
      });

      if (!geminiRes.ok) {
        throw new Error(`Gemini server API returned status ${geminiRes.status}`);
      }

      const geminiData = await geminiRes.json();
      const responseText =
        geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "No output generated.";

      // Save AI message
      console.log(
        "Server fallback: Saving assistant response for conversation:",
        activeConversationId,
      );
      const { error: assistantMsgError } = await serverSupabase.from("ai_messages").insert({
        conversation_id: activeConversationId,
        role: "assistant",
        content: responseText,
      });

      if (assistantMsgError) {
        console.error("Server fallback: FAILED to save assistant message:", assistantMsgError);
        throw new Error(`Failed to save assistant response: ${assistantMsgError.message}`);
      }

      return {
        response: responseText,
        conversationId: activeConversationId,
      };
    } catch (e: any) {
      console.error("Error in server fallback:", e);
      return {
        response: `I encountered an error processing your query in the fallback handler: ${e.message}`,
        conversationId: conversationId || "error",
      };
    }
  });

// 2. Client-side caller abstraction
// It abstracts the model calling logic so the client doesn't need to know the implementation details.
export async function sendMessage(
  message: string,
  conversationId?: string,
): Promise<{ response: string; conversationId: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("User must be authenticated to chat with EcoAI.");
    }

    // A. Attempt to invoke the Supabase Edge Function (Primary Route)
    const { data, error } = await supabase.functions.invoke("eco-ai", {
      body: { message, conversationId },
    });

    if (!error && data && data.response) {
      return {
        response: data.response,
        conversationId: data.conversationId,
      };
    }

    const edgeErrorMsg = error
      ? error.message || String(error)
      : "Unknown Edge Function response error";
    console.warn(
      `Supabase Edge Function failed: ${edgeErrorMsg}. Attempting start server function fallback...`,
    );

    // B. Trigger the Server Function Fallback (Secondary Route)
    try {
      const fallbackRes = await callGeminiServerFn({
        data: {
          message,
          conversationId,
          userToken: session.access_token,
        },
      });

      if (
        fallbackRes &&
        fallbackRes.response &&
        !fallbackRes.response.includes("EcoAI is currently offline")
      ) {
        return fallbackRes;
      }
    } catch (fallbackErr) {
      console.warn("Server fallback execution failed:", fallbackErr);
    }

    // If fallback was offline or failed, throw the primary Edge Function error to show the user the correct database/connection issue
    throw new Error(edgeErrorMsg);
  } catch (err: any) {
    console.error("All AI provider channels failed:", err);

    let userFriendlyMsg = "EcoAI is temporarily unavailable";
    const errorText = String(err?.message || err || "").toLowerCase();

    if (
      errorText.includes("429") ||
      errorText.includes("quota") ||
      errorText.includes("limit") ||
      errorText.includes("demand") ||
      errorText.includes("too many requests") ||
      errorText.includes("503")
    ) {
      userFriendlyMsg =
        "EcoAI is currently experiencing high demand. Please try again in a few moments.";
    }

    return {
      response: userFriendlyMsg,
      conversationId: conversationId || "offline-error",
    };
  }
}
