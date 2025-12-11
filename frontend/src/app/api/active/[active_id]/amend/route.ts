import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    await new Promise(resolve => setTimeout(resolve, 600));
    return NextResponse.json({
        id: Math.floor(Math.random() * 1000) + 2000,
        message: 'Amendment process started (mock)'
    }, { status: 201 });
}
