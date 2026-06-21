import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
      throw new Error("Missing system environment variables on Supabase host.");
    }

    // 1. Authenticate user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized JWT" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse request payload
    const { message, conversationId } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Query user context for Gemini (AI Context Enhancement)
    // Profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Carbon Profile
    const { data: carbonProfile } = await supabase
      .from("carbon_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Active Goals
    const { data: goals } = await supabase
      .from("goals")
      .select("title, category, target_value, progress_value, deadline")
      .eq("user_id", user.id)
      .eq("status", "active");

    // Active Challenges
    const { data: userChallenges } = await supabase
      .from("user_challenges")
      .select("progress, challenges(title, description, xp, category)")
      .eq("user_id", user.id)
      .eq("status", "joined");

    // Recent Footprint Records
    const { data: footprintRecords } = await supabase
      .from("footprint_records")
      .select(
        "record_date, transport_emissions, energy_emissions, food_emissions, shopping_emissions, waste_emissions, total_emissions",
      )
      .eq("user_id", user.id)
      .order("record_date", { ascending: false })
      .limit(5);

    // Recent Simulations
    const { data: simulations } = await supabase
      .from("simulations")
      .select("scenario_data, annual_savings, percentage_reduction, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    // 4. Manage/create conversation
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      console.log(`Deno Edge Function: Creating conversation for user: ${user.id}`);
      const { data: newConv, error: convError } = await supabase
        .from("ai_conversations")
        .insert({ user_id: user.id, title: message.substring(0, 40) })
        .select()
        .single();

      if (convError) {
        console.error("Deno Edge Function: FAILED to create conversation in Supabase:", convError);
        throw new Error(`Failed to create conversation in Supabase: ${convError.message}`);
      }
      if (!newConv) {
        console.error("Deno Edge Function: Conversation insert returned no data");
        throw new Error("Failed to create conversation: insert returned no data");
      }
      activeConversationId = newConv.id;
      console.log(
        `Deno Edge Function: Created conversation successfully with ID: ${activeConversationId}`,
      );
    }

    // Load recent history (up to 15 messages)
    const { data: history, error: historyError } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", activeConversationId)
      .order("created_at", { ascending: true })
      .limit(15);

    if (historyError) {
      console.error(
        `Deno Edge Function: FAILED to load history for conversation ${activeConversationId}:`,
        historyError,
      );
      throw new Error(`Failed to load conversation history: ${historyError.message}`);
    }

    // 5. Save the user's new message to the database
    console.log(
      `Deno Edge Function: Saving user message for conversation: ${activeConversationId}`,
    );
    const { error: userMsgError } = await supabase.from("ai_messages").insert({
      conversation_id: activeConversationId,
      role: "user",
      content: message,
    });

    if (userMsgError) {
      console.error(
        `Deno Edge Function: FAILED to save user message for conversation ${activeConversationId}:`,
        userMsgError,
      );
      throw new Error(`Failed to save user message to database: ${userMsgError.message}`);
    }

    // 6. Build the System Prompt with full Context Enhancement
    const systemPrompt = `You are EcoAI, a world-class sustainability coach and environmental scientist integrated into CarbonLens AI. 
The user is talking to you to seek custom, highly actionable climate action strategies.
You MUST personalize your responses based on the following authenticated user stats:
- User Name: ${profile?.name ?? "CarbonLens Member"}
- XP: ${profile?.xp_points ?? 0} (Level ${profile?.level ?? 1})
- Sustainability Score: ${profile?.sustainability_score ?? 70}/100
- Offset Trees Planted: ${profile?.trees_planted ?? 0}
- Current Commute Habits: ${carbonProfile?.transportation_type ?? "Car (solo)"} (${carbonProfile?.weekly_distance ?? 150} km/week)
- Household Power: ${carbonProfile?.energy_type ?? "Mixed grid"}
- Dietary Habit: ${carbonProfile?.food_diet ?? "Mixed meat/veg"}
- Recycling Habits: ${carbonProfile?.waste_recycling ?? "Some recycling"}

Active Goals:
${goals && goals.length > 0 ? goals.map((g) => `- ${g.title} (${g.category}): target ${g.target_value}, current progress ${g.progress_value}`).join("\n") : "None set yet."}

Active Joined Challenges:
${userChallenges && userChallenges.length > 0 ? userChallenges.map((uc) => `- ${(uc.challenges as any)?.title} (${(uc.challenges as any)?.category}): progress ${uc.progress}%, rewards ${(uc.challenges as any)?.xp} XP`).join("\n") : "None joined yet."}

Recent Footprint Records (kg CO2):
${footprintRecords && footprintRecords.length > 0 ? footprintRecords.map((r) => `- Date ${r.record_date}: Total ${r.total_emissions} kg (Transport: ${r.transport_emissions}, Energy: ${r.energy_emissions}, Food: ${r.food_emissions}, Shopping: ${r.shopping_emissions}, Waste: ${r.waste_emissions})`).join("\n") : "No recorded footprints yet."}

Recent Simulations Saved:
${simulations && simulations.length > 0 ? simulations.map((s) => `- Scenario saves ${s.annual_savings} kg/year (${s.percentage_reduction}% savings)`).join("\n") : "No simulator runs recorded."}

Provide highly focused, encouraging, and scientifically sound advice. Never give generic, hand-waving suggestions. Format your response clearly in Markdown (using bullet points and bolding for readability).
Keep the tone professional, friendly, motivating, and educational.`;

    // 7. Format history for Gemini contents
    const contents: any[] = [];

    // Add history
    if (history && history.length > 0) {
      for (const msg of history) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        });
      }
    }

    // Add current user prompt
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    // 8. Execute request to Gemini 2.5 Flash with Retry Logic & server-side logs
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    const requestBody = {
      contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    };

    console.log(`Deno Edge Function: Initiating Gemini API request for user ${user.id}`);

    let geminiRes: Response;
    let attempt = 0;
    const maxRetries = 3;
    const initialDelay = 1000;

    while (true) {
      attempt++;
      console.log(
        `Deno Edge Function: Sending request to Gemini API (Attempt ${attempt}/${maxRetries})`,
      );
      try {
        geminiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (geminiRes.ok) {
          console.log(
            `Deno Edge Function: Gemini API response success (status 200) on attempt ${attempt}`,
          );
          break;
        }

        const errorText = await geminiRes.text();
        console.error(
          `Deno Edge Function: Gemini API request failed on attempt ${attempt} with status ${geminiRes.status}:`,
          errorText,
        );

        if (
          geminiRes.status === 429 ||
          geminiRes.status === 503 ||
          errorText.toLowerCase().includes("quota") ||
          errorText.toLowerCase().includes("limit") ||
          errorText.toLowerCase().includes("exceeded")
        ) {
          if (attempt >= maxRetries) {
            console.warn(
              "Deno Edge Function: Gemini quota exceeded or service unavailable. Returning fallback response.",
            );
            const fallbackText =
              "EcoAI is currently experiencing high demand. Your message has been saved successfully. Please try again in a few moments.";

            // Save fallback assistant message
            await supabase.from("ai_messages").insert({
              conversation_id: activeConversationId,
              role: "assistant",
              content: fallbackText,
            });

            return new Response(
              JSON.stringify({
                response: fallbackText,
                conversationId: activeConversationId,
              }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }
          const delay = initialDelay * Math.pow(2, attempt - 1);
          console.log(
            `Deno Edge Function: Quota or service unavailable error (${geminiRes.status}). Retrying in ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // For non-retryable errors (e.g. 400 Bad Request, 401 Unauthorized)
        throw new Error(
          `Gemini API returned non-retryable status ${geminiRes.status}: ${errorText}`,
        );
      } catch (err: any) {
        console.error(
          `Deno Edge Function: Exception in Gemini request on attempt ${attempt}:`,
          err.message || err,
        );
        if (attempt >= maxRetries) {
          console.warn(
            "Deno Edge Function: Exception persisted after max retries. Returning fallback response.",
          );
          const fallbackText =
            "EcoAI is currently experiencing high demand. Your message has been saved successfully. Please try again in a few moments.";

          // Save fallback assistant message
          await supabase.from("ai_messages").insert({
            conversation_id: activeConversationId,
            role: "assistant",
            content: fallbackText,
          });

          return new Response(
            JSON.stringify({
              response: fallbackText,
              conversationId: activeConversationId,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.log(`Deno Edge Function: Retrying in ${delay}ms due to exception...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    const geminiData = await geminiRes.json();
    const aiResponseText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I was unable to generate a recommendation at this time. Please try again.";

    // 9. Save Gemini response to database
    console.log(
      `Deno Edge Function: Saving assistant response for conversation: ${activeConversationId}`,
    );
    const { error: assistantMsgError } = await supabase.from("ai_messages").insert({
      conversation_id: activeConversationId,
      role: "assistant",
      content: aiResponseText,
    });

    if (assistantMsgError) {
      console.error(
        `Deno Edge Function: FAILED to save assistant response for conversation ${activeConversationId}:`,
        assistantMsgError,
      );
      throw new Error(
        `Failed to save assistant response to database: ${assistantMsgError.message}`,
      );
    }

    return new Response(
      JSON.stringify({
        response: aiResponseText,
        conversationId: activeConversationId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Error in eco-ai edge function:", error.message || error);

    // Normalize and hide raw system details/stack traces from clients
    let cleanMessage = "EcoAI is temporarily unavailable";
    const errStr = String(error.message || error);
    if (
      errStr.includes("429") ||
      errStr.includes("quota") ||
      errStr.includes("limit") ||
      errStr.includes("demand") ||
      errStr.includes("Too Many Requests")
    ) {
      cleanMessage =
        "EcoAI is currently experiencing high demand. Please try again in a few moments.";
    }

    return new Response(JSON.stringify({ error: cleanMessage }), {
      status: errStr.includes("429") ? 429 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
