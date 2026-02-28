-- 1. Add channel_id to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS channel_id TEXT DEFAULT 'global';

-- 2. Create channels table
CREATE TABLE IF NOT EXISTS public.channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'global', 'direct', 'group'
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Insert global channel
INSERT INTO public.channels (id, name, type) VALUES ('global', 'Global Chat', 'global') ON CONFLICT DO NOTHING;

-- 4. Create channel_members table
CREATE TABLE IF NOT EXISTS public.channel_members (
  channel_id TEXT REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  PRIMARY KEY (channel_id, user_id)
);

-- 5. Create user_stickers table
CREATE TABLE IF NOT EXISTS public.user_stickers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Enable RLS
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stickers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on channels" ON public.channels FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on channels" ON public.channels FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on channel_members" ON public.channel_members FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on channel_members" ON public.channel_members FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on user_stickers" ON public.user_stickers FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on user_stickers" ON public.user_stickers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access on user_stickers" ON public.user_stickers FOR DELETE USING (true);

-- 7. Enable Realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_stickers;
