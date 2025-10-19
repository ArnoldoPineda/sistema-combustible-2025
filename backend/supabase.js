const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lizgdoulwdqljloliyuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpemdkb3Vsd2RxbGpsb2xpeXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMTk4ODUsImV4cCI6MjA3NDc5NTg4NX0.8GMaS0ebU1Wgb0aeRNkK_juKsfSe_acdgJilzgOGyCY';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;