
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ussrjygtplvedrjgstec.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzc3JqeWd0cGx2ZWRyamdzdGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY3MTMsImV4cCI6MjA4MDk2MjcxM30.vapkBfasF40Q7GHf0UULppcuaszNRQrkZ1d2KQnNg-8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    console.log("--- COMPREHENSIVE DATA CHECK (Active) ---");

    // 1. Get ALL Active contracts with related data
    const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
        id, 
        title, 
        contract_number, 
        appointed_vendor, 
        contract_vendors(vendor_name, is_appointed, price_note, revised_price_note),
        contract_bid_agenda(step_name, remarks)
    `)
        .eq('status', 'Active');

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Found ${contracts.length} Active contracts.`);

    contracts.forEach(c => {
        console.log(`\nContract: "${c.title}" (${c.id})`);
        console.log(` - DB Column 'appointed_vendor': ${c.appointed_vendor}`);

        // Check Vendors
        console.log(` - Related Vendors: ${contracts.contract_vendors?.length || 0}`);

        // Check Agenda
        const agendaStep = c.contract_bid_agenda.find(s => s.step_name === "Appointed Vendor");
        console.log(` - Agenda 'Appointed Vendor' Step: ${agendaStep ? 'Found' : 'Missing'}`);
        if (agendaStep) {
            console.log(`   * Remarks: ${agendaStep.remarks}`);
        }

        const agendaVendor = agendaStep?.remarks;
        console.log(` => FINAL EXPECTED VENDOR DISPLAY: "${agendaVendor || '-'}"`);
    });
}

testFetch();
