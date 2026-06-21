import { supabase } from "@/lib/supabase";
import { Profile, Achievement } from "@/types/database";

/**
 * Calculates user level based on total XP points.
 * Formula: 500 XP per level. Level 1 = 0-499 XP, Level 2 = 500-999 XP, etc.
 */
export function calculateLevel(xp: number): number {
  return Math.floor(xp / 500) + 1;
}

/**
 * Awards XP points to a user, handles leveling up, logs the activity, and sends a notification.
 */
export async function awardXP(
  userId: string,
  xpAmount: number,
  description: string,
  icon: string = "✨",
): Promise<{ newXp: number; newLevel: number; leveledUp: boolean }> {
  try {
    // 1. Fetch current profile
    const { data: profile, error: fetchErr } = await supabase
      .from("profiles")
      .select("xp_points, level, name, streak, last_activity_date")
      .eq("id", userId)
      .single();

    if (fetchErr || !profile) {
      throw new Error(`Failed to load profile for XP award: ${fetchErr?.message}`);
    }

    const currentXp = profile.xp_points ?? 0;
    const currentLevel = profile.level ?? 1;
    const currentStreak = profile.streak ?? 0;
    const lastActiveStr = profile.last_activity_date;

    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    let newStreak = currentStreak;

    if (!lastActiveStr) {
      newStreak = 1;
    } else {
      const todayDate = new Date(todayStr);
      const lastActiveDate = new Date(lastActiveStr);
      const diffTime = todayDate.getTime() - lastActiveDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        if (newStreak === 0) newStreak = 1;
      } else if (diffDays === 1) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    }

    const newXp = currentXp + xpAmount;
    const newLevel = calculateLevel(newXp);
    const leveledUp = newLevel > currentLevel;

    // 2. Update profile
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        xp_points: newXp,
        level: newLevel,
        streak: newStreak,
        last_activity_date: todayStr,
      })
      .eq("id", userId);

    if (updateErr) {
      throw updateErr;
    }

    // 3. Log activity
    await supabase.from("activity_logs").insert({
      user_id: userId,
      activity_type: "xp_award",
      description,
      xp_earned: xpAmount,
      icon,
    });

    // 4. Create Notification
    await supabase.from("notifications").insert({
      user_id: userId,
      title: `+${xpAmount} XP Earned!`,
      message: description,
      type: "success",
      icon,
    });

    // 5. Send Level Up Notification if true
    if (leveledUp) {
      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Level Up! 🎉",
        message: `Congratulations! You reached Level ${newLevel}. Keep up the great work!`,
        type: "success",
        icon: "🏆",
      });

      // Update activity log for level up
      await supabase.from("activity_logs").insert({
        user_id: userId,
        activity_type: "level_up",
        description: `Leveled up to Level ${newLevel}!`,
        xp_earned: 0,
        icon: "🏆",
      });
    }

    return { newXp, newLevel, leveledUp };
  } catch (err) {
    console.error("Error awarding XP:", err);
    return { newXp: 0, newLevel: 1, leveledUp: false };
  }
}

/**
 * Checks if a user has unlocked a specific achievement, and if not, awards it.
 * Unlocking awards +200 XP to the user.
 */
export async function awardAchievement(userId: string, achievementKey: string): Promise<boolean> {
  try {
    // 1. Get achievement info
    const { data: achievement, error: achErr } = await supabase
      .from("achievements")
      .select("*")
      .eq("key", achievementKey)
      .single();

    if (achErr || !achievement) {
      console.warn(`Achievement with key ${achievementKey} not found in database.`);
      return false;
    }

    // 2. Check if already earned
    const { data: existing, error: existErr } = await supabase
      .from("user_achievements")
      .select("id")
      .eq("user_id", userId)
      .eq("achievement_id", achievement.id)
      .maybeSingle();

    if (existing) {
      return false; // Already earned
    }

    // 3. Earn achievement
    const { error: earnErr } = await supabase.from("user_achievements").insert({
      user_id: userId,
      achievement_id: achievement.id,
    });

    if (earnErr) {
      throw earnErr;
    }

    // 4. Award XP
    const xpReward = achievement.xp_reward ?? 200;
    await awardXP(
      userId,
      xpReward,
      `Unlocked Achievement: ${achievement.title} - ${achievement.description}`,
      achievement.icon ?? "🎖️",
    );

    return true;
  } catch (err) {
    console.error("Error awarding achievement:", err);
    return false;
  }
}

/**
 * Scans user state and updates/awards scores or achievements accordingly.
 */
export async function performMetricCheck(userId: string): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("sustainability_score, trees_planted")
      .eq("id", userId)
      .single();

    if (!profile) return;

    // Check Planet Protector (Score >= 75)
    if (profile.sustainability_score >= 75) {
      await awardAchievement(userId, "planet_protector");
    }

    // Check Tree Hugger (Trees >= 10)
    if (profile.trees_planted >= 10) {
      await awardAchievement(userId, "tree_hugger");
    }
  } catch (e) {
    console.error("Error performing metric check:", e);
  }
}
