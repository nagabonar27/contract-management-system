import { NextResponse } from 'next/server';
import { MOCK_ONGOING, MOCK_STATS } from '@/lib/mock-data';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const contractId = parseInt(id);

    // Find the contract in mock data
    const contract = MOCK_ONGOING.find(c => c.id === contractId);

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!contract) {
        // Fallback for demo: if ID not found (e.g. created freshly in mock), return a generic mock
        // This helps the demo flow even if data isn't persisted
        return NextResponse.json({
            contract: {
                id: contractId,
                contract_name: 'Mock Created Contract',
                contract_type: 'Pending',
                step_name: 'Waiting Doc from User',
                current_step_id: 1,
                is_active_process: 1
            },
            logs: [],
            steps: MOCK_STATS.map((s, idx) => ({
                step_id: idx + 1,
                step_name: s.step_name,
                step_order: idx + 1
            }))
        });
    }

    // Return specific mock data
    return NextResponse.json({
        contract,
        logs: [
            {
                log_id: 1,
                step_name: 'Waiting Doc from User',
                status_date: '2024-03-20',
                remarks: 'Initial Request Created'
            }
        ],
        steps: MOCK_STATS.map((s, idx) => ({
            step_id: idx + 1,
            step_name: s.step_name,
            step_order: idx + 1
        }))
    });
}
