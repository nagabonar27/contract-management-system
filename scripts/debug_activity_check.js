
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function check() {
    console.log("Checking contract_bid_agenda...")
    const { data: agenda, error: agendaError } = await supabase
        .from('contract_bid_agenda')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(5)

    if (agendaError) {
        console.error("Agenda Error:", agendaError)
    } else {
        console.log(`Found ${agenda.length} agenda items.`)
        console.log(JSON.stringify(agenda, null, 2))
    }

    console.log("Checking contract_versions...")
    const { data: recent, error: rError } = await supabase
        .from('contract_versions')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(5)

    if (rError) {
        console.error("Recent Error:", rError)
    } else {
        console.log(`Found ${recent.length} recent versions.`)
        console.log(JSON.stringify(recent, null, 2))
    }
}

check()
