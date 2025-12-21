
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ussrjygtplvedrjgstec.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzc3JqeWd0cGx2ZWRyamdzdGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY3MTMsImV4cCI6MjA4MDk2MjcxM30.vapkBfasF40Q7GHf0UULppcuaszNRQrkZ1d2KQnNg-8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedData() {
    console.log("--- SEEDING DATA FOR 'Kontrak Ctes' ---");

    // 1. Get the Contract
    const { data: contract, error: findError } = await supabase
        .from('contracts')
        .select('id')
        .eq('title', 'Kontrak Ctes')
        .eq('status', 'Active')
        .single();

    if (findError || !contract) {
        console.error("Contract not found!", findError);
        return;
    }

    const contractId = contract.id;
    console.log(`Found Contract ID: ${contractId}`);

    // 2. Insert Vendors
    const vendors = [
        {
            contract_id: contractId,
            vendor_name: 'PT Sejahtera Abadi',
            is_appointed: true,
            price_note: '100.000.000',
            revised_price_note: '95.000.000'
        },
        {
            contract_id: contractId,
            vendor_name: 'PT Mahal Jaya',
            is_appointed: false,
            price_note: '120.000.000',
            revised_price_note: null
        }
    ];

    const { error: vendorError } = await supabase
        .from('contract_vendors')
        .insert(vendors);

    if (vendorError) {
        console.error("Error inserting vendors:", vendorError);
    } else {
        console.log("Inserted 2 Vendors.");
    }

    // 3. Update Agenda (or insert if missing)
    // First, check if agenda exists
    const { data: agenda } = await supabase
        .from('contract_bid_agenda')
        .select('*')
        .eq('contract_id', contractId)
        .eq('step_name', 'Appointed Vendor');

    if (agenda && agenda.length > 0) {
        // Update
        await supabase
            .from('contract_bid_agenda')
            .update({ remarks: 'PT Sejahtera Abadi' })
            .eq('id', agenda[0].id);
        console.log("Updated Agenda remarks.");
    } else {
        // Insert
        await supabase.from('contract_bid_agenda').insert({
            contract_id: contractId,
            step_name: 'Appointed Vendor',
            status: 'Completed',
            remarks: 'PT Sejahtera Abadi',
            start_date: new Date().toISOString()
        });
        console.log("Inserted Agenda step.");
    }

    console.log("Seeding Complete. Please referesh frontend.");
}

seedData();
