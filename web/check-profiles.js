const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let supabaseUrl = '';
let supabaseServiceKey = '';

try {
  const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    } else if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.split('=')[1].trim();
    }
  }
} catch (err) {
  console.error("Could not read .env.local file:", err.message);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  try {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
      console.error("Error fetching profiles:", error.message);
    } else {
      console.log("Profiles in database:", data);
    }
  } catch (e) {
    console.error("Error running check:", e);
  }
}

check();
