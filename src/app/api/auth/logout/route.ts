import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ message: 'Logged out' });
  response.cookies.delete('next-auth.session-token');
  response.cookies.delete('next-auth.csrf-token');
  response.cookies.delete('next-auth.callback-url');
  return response;
}
