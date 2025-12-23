
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectContracts() {
    console.log("--- Fetching one contract (raw) ---");
    const { data: oneContract, error: oneError } = await supabase
        .from('contracts')
        .select('*')
        .limit(1);

    if (oneError) {
        console.error("Error fetching one contract:", oneError);
    } else {
        if (oneContract.length > 0) {
            console.log("Columns found:", Object.keys(oneContract[0]).join(', '));
            console.log("Sample row:", JSON.stringify(oneContract[0], null, 2));
        } else {
            console.log("No contracts found in DB.");
        }
    }

    console.log("\n--- Checking Statuses ---");
    const { data: statuses, error: statusError } = await supabase
        .from('contracts')
        .select('status');

    if (statuses) {
        const unique = [...new Set(statuses.map(s => s.status))];
        console.log("Unique Statuses:", unique);
    }

    console.log("\n--- Testing Relation: contract_types ---");
    const { data: types, error: typeError } = await supabase
        .from('contracts')
        .select('contract_types(name)')
        .limit(1);

    if (typeError) console.error("Error fetching contract_types:", typeError.message);
    else console.log("contract_types relation works.");
}

inspectContracts();
