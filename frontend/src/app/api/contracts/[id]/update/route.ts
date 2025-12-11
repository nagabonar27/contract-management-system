import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return NextResponse.json({ message: 'Mock contract updated' });
}
