const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
            supabaseUrl = line.split('=')[1].replace(/"/g, '').trim();
        }
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
            supabaseKey = line.split('=')[1].replace(/"/g, '').trim();
        }
    });
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFullQuery() {
    console.log('Running Full Query Simulation...');

    const { data, error } = await supabase
        .from('contracts')
        .select(`
            id, 
            title, 
            contract_number,
            status, 
            contract_type_id,
            created_at,
            updated_at,
            current_step,
            category,
            division,
            parent_contract_id,
            version,
            contract_amount,
            department,
            contract_types ( name ),
            profiles:profiles!contracts_created_by_profile_fkey ( full_name ),
            contract_bid_agenda ( step_name, start_date, end_date, updated_at, remarks )
        `)
        .neq('status', 'Active')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('FULL QUERY FAILED:', JSON.stringify(error, null, 2));
    } else {
        console.log(`Success! Retrieved ${data.length} records.`);
        if (data.length > 0) {
            console.log('Sample Record:', JSON.stringify(data[0], null, 2));
        } else {
            console.log('Result is empty array.');
        }
    }
}

checkFullQuery();
