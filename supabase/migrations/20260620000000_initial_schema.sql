-- Initial schema migration for CarbonLens AI

-- Create tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar TEXT,
  location TEXT,
  sustainability_score INTEGER DEFAULT 70,
  streak INTEGER DEFAULT 0,
  trees_planted INTEGER DEFAULT 0,
  rank INTEGER,
  role TEXT DEFAULT 'user',
  xp_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  last_activity_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.carbon_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  transportation_type TEXT DEFAULT 'Car (solo)',
  weekly_distance NUMERIC DEFAULT 150.0,
  energy_type TEXT DEFAULT 'Mixed grid',
  food_diet TEXT DEFAULT 'Meat 4–5 days/week',
  shopping_frequency TEXT DEFAULT 'Weekly',
  waste_recycling TEXT DEFAULT 'Some recycling',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.footprint_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  record_date DATE DEFAULT CURRENT_DATE,
  transport_emissions NUMERIC DEFAULT 0,
  energy_emissions NUMERIC DEFAULT 0,
  food_emissions NUMERIC DEFAULT 0,
  shopping_emissions NUMERIC DEFAULT 0,
  waste_emissions NUMERIC DEFAULT 0,
  total_emissions NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  progress_value NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'archived'
  deadline DATE,
  icon TEXT DEFAULT '🎯',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.goal_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  value_changed NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  xp INTEGER DEFAULT 0,
  icon TEXT DEFAULT '🏆',
  category TEXT,
  duration TEXT,
  required_days INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  progress NUMERIC DEFAULT 0,
  completed_days INTEGER DEFAULT 0,
  status TEXT DEFAULT 'joined', -- 'joined', 'completed', 'abandoned'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT unique_user_challenge UNIQUE (user_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🎖️',
  key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS public.simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scenario_data JSONB NOT NULL,
  annual_savings NUMERIC DEFAULT 0,
  percentage_reduction NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user', 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'success', 'warning', 'info', 'tip'
  icon TEXT DEFAULT '🔔',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE DEFAULT CURRENT_DATE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  xp_earned INTEGER DEFAULT 0,
  carbon_saved NUMERIC DEFAULT 0,
  icon TEXT DEFAULT '📝',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carbon_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.footprint_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies

-- Profiles: Select is public for leaderboard; Update only for owner
CREATE POLICY "Allow select profiles for everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow update profile for owner" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Carbon Profiles: owner CRUD
CREATE POLICY "Allow CRUD for carbon_profiles owner" ON public.carbon_profiles FOR ALL USING (auth.uid() = id);

-- Footprint Records: owner CRUD
CREATE POLICY "Allow CRUD for footprint_records owner" ON public.footprint_records FOR ALL USING (auth.uid() = user_id);

-- Goals: owner CRUD
CREATE POLICY "Allow CRUD for goals owner" ON public.goals FOR ALL USING (auth.uid() = user_id);

-- Goal Progress: owner CRUD through goals
CREATE POLICY "Allow CRUD for goal_progress owner" ON public.goal_progress FOR ALL USING (
  EXISTS (SELECT 1 FROM public.goals WHERE id = goal_progress.goal_id AND user_id = auth.uid())
);

-- Challenges: Select is public
CREATE POLICY "Allow select challenges for everyone" ON public.challenges FOR SELECT USING (true);

-- User Challenges: owner CRUD
CREATE POLICY "Allow CRUD for user_challenges owner" ON public.user_challenges FOR ALL USING (auth.uid() = user_id);

-- Achievements: Select is public
CREATE POLICY "Allow select achievements for everyone" ON public.achievements FOR SELECT USING (true);

-- User Achievements: select/insert for owner
CREATE POLICY "Allow select user_achievements owner" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow insert user_achievements owner" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Simulations: owner CRUD
CREATE POLICY "Allow CRUD for simulations owner" ON public.simulations FOR ALL USING (auth.uid() = user_id);

-- AI Conversations: owner CRUD
CREATE POLICY "Allow CRUD for conversations owner" ON public.ai_conversations FOR ALL USING (auth.uid() = user_id);

-- AI Messages: owner CRUD through conversations
CREATE POLICY "Allow CRUD for messages owner" ON public.ai_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.ai_conversations WHERE id = ai_messages.conversation_id AND user_id = auth.uid())
);

-- Notifications: owner CRUD
CREATE POLICY "Allow CRUD for notifications owner" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- Leaderboard Snapshots: Select is public
CREATE POLICY "Allow select leaderboard_snapshots for everyone" ON public.leaderboard_snapshots FOR SELECT USING (true);

-- Activity Logs: owner select/insert
CREATE POLICY "Allow select activity_logs owner" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow insert activity_logs owner" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Triggers & Functions

-- 1. Automatically create profile + carbon profile on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
BEGIN
  v_name := COALESCE(new.raw_user_meta_data->>'full_name', SPLIT_PART(new.email, '@', 1));
  
  INSERT INTO public.profiles (id, name, email, avatar, location, sustainability_score, streak, trees_planted, role, xp_points, level, last_activity_date)
  VALUES (
    new.id,
    v_name,
    new.email,
    UPPER(SUBSTRING(v_name FROM 1 FOR 2)),
    'Not set',
    70,
    0,
    0,
    'user',
    0,
    1,
    NULL
  );

  INSERT INTO public.carbon_profiles (id, transportation_type, weekly_distance, energy_type, food_diet, shopping_frequency, waste_recycling)
  VALUES (
    new.id,
    'Car (solo)',
    150.0,
    'Mixed grid',
    'Meat 4–5 days/week',
    'Weekly',
    'Some recycling'
  );

  -- Log initial sign up activity
  INSERT INTO public.activity_logs (user_id, activity_type, description, xp_earned, carbon_saved, icon)
  VALUES (new.id, 'registration', 'Joined CarbonLens AI', 50, 0, '🌱');

  -- Create welcome notification
  INSERT INTO public.notifications (user_id, title, message, type, icon)
  VALUES (new.id, 'Welcome to CarbonLens!', 'We are excited to help you measure, understand and reduce your footprint.', 'info', '🌱');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Update carbon_profiles.updated_at
CREATE OR REPLACE FUNCTION public.handle_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  new.updated_at = NOW();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_carbon_profile_updated
  BEFORE UPDATE ON public.carbon_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_update_timestamp();

-- Seed data for Challenges
INSERT INTO public.challenges (title, description, xp, icon, category, duration, required_days)
VALUES
  ('Meat-Free Monday', 'Skip meat every Monday this month to save land and water.', 200, '🥗', 'Food', '4 weeks', 4),
  ('Walk 5km Daily', 'Ditch the car keys and take a 5km walk or bike ride every day.', 350, '🚶', 'Activity', '7 days', 7),
  ('No Plastic Week', 'Avoid single-use plastic cups, straws, bags and packaging.', 500, '♻️', 'Waste', '7 days', 7),
  ('Public Transport Hero', 'Commute only using buses, trains, or subways for 14 days.', 600, '🚆', 'Transport', '14 days', 14),
  ('Zero Food Waste', 'Compost organic scraps and eat everything else this week.', 250, '🌱', 'Food', '7 days', 7),
  ('Cold Wash Champion', 'Wash all laundry loads on cold settings for 30 days.', 180, '💧', 'Energy', '30 days', 30)
ON CONFLICT DO NOTHING;

-- Seed data for Achievements
INSERT INTO public.achievements (title, description, icon, key)
VALUES
  ('Eco Beginner', 'Complete the onboarding configuration.', '🌱', 'eco_beginner'),
  ('Waste Warrior', 'Complete a recycling or zero waste challenge.', '♻️', 'waste_warrior'),
  ('Green Commuter', 'Log public transport, walk, or cycling for 100km total.', '🚴', 'green_commuter'),
  ('Planet Protector', 'Reach a sustainability score of 75+ points.', '🌍', 'planet_protector'),
  ('Tree Hugger', 'Plant your first 10 offset trees.', '🌳', 'tree_hugger'),
  ('Solar Sage', 'Upgrade your simulated home energy profile to fully renewable.', '☀️', 'solar_sage'),
  ('Vegan Voyager', 'Transition your food profile to 100% plant-based diet.', '🥦', 'vegan_voyager'),
  ('Carbon Crusher', 'Reduce your monthly carbon output by 25% vs baseline.', '💚', 'carbon_crusher')
ON CONFLICT (key) DO NOTHING;
