import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env: Record<string, string> = {}
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) env[match[1]] = match[2].trim()
})

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    const contractId = 'a08755c2-8f38-4fd6-b3c3-99354c93697c' // Sewa Rumah from browser session

    console.log(`Checking direct data for contract: ${contractId}`)

    // Check Agenda
    const { data: agenda, error: agendaError } = await supabase
        .from('contract_bid_agenda')
        .select('*')
        .eq('contract_id', contractId)

    if (agendaError) console.error('Agenda Error:', agendaError)
    else console.log('Direct Agenda count:', agenda?.length, agenda)

    // Check Contract Created By
    const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('created_by')
        .eq('id', contractId)
        .single()

    if (contractError) console.error('Contract Error:', contractError)
    else {
        const userId = contract?.created_by
        console.log('Contract created_by:', userId)

        if (userId) {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (profileError) console.error('Profile Error:', profileError)
            else console.log('Profile found:', profile)
        } else {
            console.log('created_by is null')
        }
    }
}

run()
