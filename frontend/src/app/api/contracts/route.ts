import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const body = await request.json();

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Return a mock success response with a new ID
    return NextResponse.json({
        id: Math.floor(Math.random() * 1000) + 1000,
        message: 'Mock contract created successfully',
        ...body
    }, { status: 201 });
}
