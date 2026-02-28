-- 1. Create the messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  file_url TEXT,
  reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL
);

-- 2. Enable Row Level Security (RLS) but allow all operations for this simple chat
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.messages
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON public.messages
  FOR INSERT WITH CHECK (true);

-- 3. Enable Realtime for the messages table
-- Drop the publication if it exists to avoid errors, then recreate
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE public.messages;

-- 4. Set up Storage for files
-- Create a new bucket named 'chat_files' if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_files', 'chat_files', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Set up Storage RLS policies
-- Allow public access to read files
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat_files');

-- Allow public access to upload files
CREATE POLICY "Public Upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat_files');
