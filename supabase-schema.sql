-- Draftly Database Schema
-- Safe to rerun in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES
-- ============================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text not null,
  email text not null,
  title text not null default 'Novice Writer',
  level integer not null default 1,
  xp integer not null default 0,
  streak integer not null default 0,
  longest_streak integer not null default 0,
  last_writing_date date,
  daily_word_goal integer not null default 300,
  daily_vocab_goal integer not null default 5,
  custom_daily_goal text not null default 'Write for 10 minutes',
  active_theme text not null default 'default',
  unlocked_themes text[] not null default '{"default"}',
  plan text not null default 'free' check (plan in ('free', 'plus')),
  student_id text,
  age_group text not null default '',
  writing_goal text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Run these if adding columns to an existing table:
-- alter table public.profiles add column if not exists age_group text not null default '';
-- alter table public.profiles add column if not exists writing_goal text not null default '';

alter table public.profiles enable row level security;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- ============================================
-- WRITINGS
-- ============================================
create table if not exists public.writings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null default 'Untitled',
  content text not null default '',
  prompt text,
  category text not null default 'Creative Fiction',
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'reviewed')),
  word_count integer not null default 0,
  xp_earned integer not null default 0,
  is_favorite boolean not null default false,
  feedback text,
  strengths text,
  improvements text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.writings enable row level security;
drop policy if exists "Users can view own writings" on public.writings;
drop policy if exists "Users can insert own writings" on public.writings;
drop policy if exists "Users can update own writings" on public.writings;
drop policy if exists "Users can delete own writings" on public.writings;
create policy "Users can view own writings" on public.writings for select using (auth.uid() = user_id);
create policy "Users can insert own writings" on public.writings for insert with check (auth.uid() = user_id);
create policy "Users can update own writings" on public.writings for update using (auth.uid() = user_id);
create policy "Users can delete own writings" on public.writings for delete using (auth.uid() = user_id);

-- ============================================
-- VOCAB WORDS
-- ============================================
create table if not exists public.vocab_words (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  word text not null,
  meaning text not null,
  example_sentence text not null default '',
  times_used integer not null default 0,
  times_to_master integer not null default 5,
  mastered boolean not null default false,
  source_writing_id uuid references public.writings(id) on delete set null,
  user_sentence text,
  sentence_feedback jsonb,
  created_at timestamptz not null default now()
);

-- Run these if adding columns to an existing vocab_words table:
alter table public.vocab_words add column if not exists user_sentence text;
alter table public.vocab_words add column if not exists sentence_feedback jsonb;

alter table public.vocab_words enable row level security;
drop policy if exists "Users can view own vocab" on public.vocab_words;
drop policy if exists "Users can insert own vocab" on public.vocab_words;
drop policy if exists "Users can update own vocab" on public.vocab_words;
drop policy if exists "Users can delete own vocab" on public.vocab_words;
create policy "Users can view own vocab" on public.vocab_words for select using (auth.uid() = user_id);
create policy "Users can insert own vocab" on public.vocab_words for insert with check (auth.uid() = user_id);
create policy "Users can update own vocab" on public.vocab_words for update using (auth.uid() = user_id);
create policy "Users can delete own vocab" on public.vocab_words for delete using (auth.uid() = user_id);

-- ============================================
-- VOCAB TESTS
-- ============================================
create table if not exists public.vocab_tests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  score integer not null default 0,
  total_questions integer not null default 5,
  xp_earned integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.vocab_tests enable row level security;
drop policy if exists "Users can view own tests" on public.vocab_tests;
drop policy if exists "Users can insert own tests" on public.vocab_tests;
create policy "Users can view own tests" on public.vocab_tests for select using (auth.uid() = user_id);
create policy "Users can insert own tests" on public.vocab_tests for insert with check (auth.uid() = user_id);

-- ============================================
-- DAILY STATS
-- ============================================
create table if not exists public.daily_stats (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null default current_date,
  words_written integer not null default 0,
  vocab_words_used integer not null default 0,
  vocab_words_learned integer not null default 0,
  writings_completed integer not null default 0,
  xp_earned integer not null default 0,
  custom_goal_completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

alter table public.daily_stats enable row level security;
drop policy if exists "Users can view own stats" on public.daily_stats;
drop policy if exists "Users can insert own stats" on public.daily_stats;
drop policy if exists "Users can update own stats" on public.daily_stats;
create policy "Users can view own stats" on public.daily_stats for select using (auth.uid() = user_id);
create policy "Users can insert own stats" on public.daily_stats for insert with check (auth.uid() = user_id);
create policy "Users can update own stats" on public.daily_stats for update using (auth.uid() = user_id);

-- ============================================
-- XP LOG
-- ============================================
create table if not exists public.xp_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.xp_log enable row level security;
drop policy if exists "Users can view own xp log" on public.xp_log;
drop policy if exists "Users can insert own xp log" on public.xp_log;
create policy "Users can view own xp log" on public.xp_log for select using (auth.uid() = user_id);
create policy "Users can insert own xp log" on public.xp_log for insert with check (auth.uid() = user_id);

-- ============================================
-- WRITING PROMPTS (public, seeded by admin)
-- ============================================
create table if not exists public.writing_prompts (
  id uuid primary key default uuid_generate_v4(),
  prompt_text text not null,
  category text not null default 'Creative Fiction',
  difficulty text not null default 'beginner' check (difficulty in ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz not null default now()
);

alter table public.writing_prompts enable row level security;
drop policy if exists "Anyone can view prompts" on public.writing_prompts;
create policy "Anyone can view prompts" on public.writing_prompts for select using (true);

-- ============================================
-- COACH CONVERSATIONS
-- ============================================
create table if not exists public.coach_conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  mode text not null default 'thinking' check (mode in ('thinking', 'creative')),
  trainer_type text not null default 'general',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.coach_conversations enable row level security;
drop policy if exists "Users can view own conversations" on public.coach_conversations;
drop policy if exists "Users can insert own conversations" on public.coach_conversations;
drop policy if exists "Users can update own conversations" on public.coach_conversations;
drop policy if exists "Users can delete own conversations" on public.coach_conversations;
create policy "Users can view own conversations" on public.coach_conversations for select using (auth.uid() = user_id);
create policy "Users can insert own conversations" on public.coach_conversations for insert with check (auth.uid() = user_id);
create policy "Users can update own conversations" on public.coach_conversations for update using (auth.uid() = user_id);
create policy "Users can delete own conversations" on public.coach_conversations for delete using (auth.uid() = user_id);

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- AUTO-UPDATE updated_at
-- ============================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.update_updated_at();

drop trigger if exists writings_updated_at on public.writings;
create trigger writings_updated_at before update on public.writings
  for each row execute procedure public.update_updated_at();

drop trigger if exists coach_conversations_updated_at on public.coach_conversations;
create trigger coach_conversations_updated_at before update on public.coach_conversations
  for each row execute procedure public.update_updated_at();

-- ============================================
-- SEED WRITING PROMPTS
-- ============================================
/*
insert into public.writing_prompts (prompt_text, category, difficulty) values
  ('Write about a time you overcame a challenge that seemed impossible at first.', 'Personal', 'beginner'),
  ('If you could have dinner with any person from history, who would it be and why?', 'Creative Fiction', 'beginner'),
  ('Describe your favorite place in the world using all five senses.', 'Creative Fiction', 'beginner'),
  ('Write a persuasive argument for why your favorite book should be required reading in schools.', 'Persuasive Essay', 'intermediate'),
  ('Imagine you wake up one morning with the ability to talk to animals. What happens next?', 'Creative Fiction', 'beginner'),
  ('Write a blog post about a skill you''ve been learning recently.', 'Blog', 'beginner'),
  ('Compose a formal email to a teacher requesting extra help with a subject.', 'Email Entry', 'beginner'),
  ('Write a feature article about a local hero in your community.', 'Feature Article', 'intermediate'),
  ('Create a short story that begins with the sentence: "The last star flickered out."', 'Creative Fiction', 'intermediate'),
  ('Write about what the world might look like 100 years from now.', 'Creative Fiction', 'intermediate'),
  ('Argue for or against the statement: "Social media does more harm than good."', 'Persuasive Essay', 'intermediate'),
  ('Write a letter to your future self, ten years from now.', 'Personal', 'beginner'),
  ('Describe a day in the life of an astronaut living on Mars.', 'Creative Fiction', 'advanced'),
  ('Write a review of a movie or show you watched recently as if you were a professional critic.', 'Blog', 'intermediate'),
  ('Tell the story of an object in your room — where did it come from, and what does it mean to you?', 'Personal', 'beginner'),
  ('Write a persuasive speech convincing your school to adopt a four-day school week.', 'Persuasive Essay', 'advanced'),
  ('Create a short mystery story where the reader has to guess the ending.', 'Creative Fiction', 'advanced'),
  ('Write a how-to guide for something you''re good at.', 'Blog', 'beginner'),
  ('Imagine you found a door in your house that wasn''t there yesterday. What''s behind it?', 'Creative Fiction', 'beginner'),
  ('Write about a moment that changed the way you see the world.', 'Personal', 'intermediate'),
  ('Draft an article about the importance of mental health awareness in schools.', 'Feature Article', 'advanced'),
  ('Write a poem about the changing seasons and what they mean to you.', 'Creative Fiction', 'beginner'),
  ('Argue whether homework helps or hinders student learning.', 'Persuasive Essay', 'intermediate'),
  ('Write a travel blog about a place you''ve visited or dream of visiting.', 'Blog', 'beginner'),
  ('Create a dialogue between two characters who disagree about something important.', 'Creative Fiction', 'intermediate');
*/

insert into public.writing_prompts (prompt_text, category, difficulty)
select seed.prompt_text, seed.category, seed.difficulty
from (
  values
    ('Write about a time you overcame a challenge that seemed impossible at first.', 'Personal', 'beginner'),
    ('If you could have dinner with any person from history, who would it be and why?', 'Creative Fiction', 'beginner'),
    ('Describe your favorite place in the world using all five senses.', 'Creative Fiction', 'beginner'),
    ('Write a persuasive argument for why your favorite book should be required reading in schools.', 'Persuasive Essay', 'intermediate'),
    ('Imagine you wake up one morning with the ability to talk to animals. What happens next?', 'Creative Fiction', 'beginner'),
    ('Write a blog post about a skill you''ve been learning recently.', 'Blog', 'beginner'),
    ('Compose a formal email to a teacher requesting extra help with a subject.', 'Email Entry', 'beginner'),
    ('Write a feature article about a local hero in your community.', 'Feature Article', 'intermediate'),
    ('Create a short story that begins with the sentence: "The last star flickered out."', 'Creative Fiction', 'intermediate'),
    ('Write about what the world might look like 100 years from now.', 'Creative Fiction', 'intermediate'),
    ('Argue for or against the statement: "Social media does more harm than good."', 'Persuasive Essay', 'intermediate'),
    ('Write a letter to your future self, ten years from now.', 'Personal', 'beginner'),
    ('Describe a day in the life of an astronaut living on Mars.', 'Creative Fiction', 'advanced'),
    ('Write a review of a movie or show you watched recently as if you were a professional critic.', 'Blog', 'intermediate'),
    ('Tell the story of an object in your room - where did it come from, and what does it mean to you?', 'Personal', 'beginner'),
    ('Write a persuasive speech convincing your school to adopt a four-day school week.', 'Persuasive Essay', 'advanced'),
    ('Create a short mystery story where the reader has to guess the ending.', 'Creative Fiction', 'advanced'),
    ('Write a how-to guide for something you''re good at.', 'Blog', 'beginner'),
    ('Imagine you found a door in your house that wasn''t there yesterday. What''s behind it?', 'Creative Fiction', 'beginner'),
    ('Write about a moment that changed the way you see the world.', 'Personal', 'intermediate'),
    ('Draft an article about the importance of mental health awareness in schools.', 'Feature Article', 'advanced'),
    ('Write a poem about the changing seasons and what they mean to you.', 'Creative Fiction', 'beginner'),
    ('Argue whether homework helps or hinders student learning.', 'Persuasive Essay', 'intermediate'),
    ('Write a travel blog about a place you''ve visited or dream of visiting.', 'Blog', 'beginner'),
    ('Create a dialogue between two characters who disagree about something important.', 'Creative Fiction', 'intermediate')
) as seed(prompt_text, category, difficulty)
where not exists (
  select 1
  from public.writing_prompts existing
  where existing.prompt_text = seed.prompt_text
    and existing.category = seed.category
    and existing.difficulty = seed.difficulty
);
