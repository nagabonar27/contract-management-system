require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkActivity() {
    console.log("Checking for any user tracking tables...");

    // 1. List all tables (indirectly via a known table if possible, or just checking specific common names)
    // Since we can't query information_schema easily with js client, we'll probe common names.
    const tablesToCheck = ['audit_logs', 'activity_logs', 'user_actions', 'logs'];
    for (const table of tablesToCheck) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (!error) console.log(`Found table: ${table}`);
        else console.log(`Table not accessible/found: ${table}`);
    }

    // 2. Deep check of contracts columns
    console.log("Deep check of contracts columns...");
    const { data, error } = await supabase.from('contracts').select('*').limit(1);
    if (data && data.length > 0) {
        console.log("Contracts Keys:", Object.keys(data[0]));
    } else {
        console.log("No contract data or error:", error?.message);
    }
}

checkActivity();
