require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Inserting dummy contract to check schema...");
    const { data, error } = await supabase
        .from('contracts')
        .insert({ title: 'Test Schema Contract', status: 'Draft' })
        .select()
        .single();

    if (error) {
        console.error("Error inserting:", error);
    } else {
        console.log("Inserted Contract Data:", data);
        // Clean up
        await supabase.from('contracts').delete().eq('id', data.id);
    }
}

checkSchema();
