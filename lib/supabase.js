import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://crzymkebjvqhqlvjhrwb.supabase.co/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyenlta2VianZxaHFsdmpocndiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MzkzNjIsImV4cCI6MjA5MDQxNTM2Mn0.zqpbjuGH7E0AOImYZN73vo3OjmwoyRPH7fX9U0JklyA';

export const supabase = createClient(supabaseUrl, supabaseKey);