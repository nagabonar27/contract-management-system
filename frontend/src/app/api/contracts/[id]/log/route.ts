import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return NextResponse.json({ message: 'Step logged successfully (mock)' });
}
