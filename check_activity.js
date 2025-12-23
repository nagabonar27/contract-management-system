require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkActivity() {
    console.log("Checking columns for user_id...");

    // Check contracts columns by failing a select to get error or by trying common names
    const { data, error } = await supabase
        .from('contracts')
        .select('user_id, created_by, owner_id, profile_id')
        .limit(1);

    if (error) {
        console.log("Error selecting user columns (expected if they don't exist):", error.message);
    } else {
        console.log("Found columns:", data);
    }
}

checkActivity();
