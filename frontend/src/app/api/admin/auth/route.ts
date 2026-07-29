import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json(
        { error: 'Admin phrase login has been removed. Sign in with an admin account.' },
        { status: 410 }
    );
}
