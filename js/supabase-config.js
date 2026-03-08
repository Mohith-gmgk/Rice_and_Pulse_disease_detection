// ============================================================
// supabase-config.js — Supabase Initialization
// ============================================================
// Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project values
// Found at: Supabase Console → Project Settings → API
// ============================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "YOUR_SUPABASE_URL";         // e.g. https://xyzabc.supabase.co
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY"; // e.g. eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
