import { createClient } from '@supabase/supabase-js'

// Credenciales directas (temporal)
const supabaseUrl = 'https://hxwmadhoyfynymojhdco.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4d21hZGhveWZ5bnltb2poZGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMjM3NzIsImV4cCI6MjA3MjY5OTc3Mn0.S37FHwgu7r2QhYciOxdveNQJahVMZKjX6sObG1iA4J0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)