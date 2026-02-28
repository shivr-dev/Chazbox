import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://revdowtoykyjjqmnqxpa.supabase.co';
const supabaseAnonKey = 'sb_publishable_bWIXmrkeeBHU08tt0UcK-A_VMWBl-1U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
