import { NextResponse } from 'next/server';
import { MOCK_STATS, MOCK_ONGOING } from '@/lib/mock-data';

export async function GET() {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json({
        stats: MOCK_STATS,
        ongoing: MOCK_ONGOING
    });
}
