import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://suiybjvjggqhabfswotv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1aXlianZqZ2dxaGFiZnN3b3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDc3ODYsImV4cCI6MjA4ODU4Mzc4Nn0.MiDf0HPkJEoDlQS2gi0WLKu6SNTxi5lG6LoyF9My6O0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);