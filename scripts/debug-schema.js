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

async function checkAgenda() {
    console.log('Checking Bid Agenda Schema...');

    const { data, error } = await supabase
        .from('contract_bid_agenda')
        .select('remarks')
        .limit(1);

    if (error) {
        console.error('Error selecting remarks from contract_bid_agenda:', error);
    } else {
        console.log('Successfully selected remarks column. Data:', data);
    }
}

checkAgenda();
