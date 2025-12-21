const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to load env from .env.local
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

if (!supabaseUrl || !supabaseKey) {
    console.error('Could not find Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkContracts() {
    console.log('Checking contracts...');

    // 1. Total count
    const { count: total, error: countError } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error counting contracts:', countError);
        return;
    }
    console.log('Total Contracts:', total);

    // 2. Status distribution
    const { data: allContracts, error: listError } = await supabase
        .from('contracts')
        .select('status, id, title');

    if (listError) {
        console.error('Error listing contracts:', listError);
        return;
    }

    const statusCounts = {};
    allContracts.forEach(c => {
        statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    });
    console.log('Status Counts:', statusCounts);

    // 3. Check "Ongoing" query logic (neq Active)
    const ongoingCount = allContracts.filter(c => c.status !== 'Active').length;
    console.log('Contracts NOT Active (Ongoing):', ongoingCount);

    if (ongoingCount > 0) {
        console.log('Sample Ongoing Contract:', allContracts.find(c => c.status !== 'Active'));
    }
}

checkContracts();
