import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

async function requireManager() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: 'Unauthorized', status: 401 as const };
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || !user.kitaId || !['ADMIN', 'KITA_LEITER'].includes(user.role)) return { error: 'Forbidden', status: 403 as const };
  return { user };
}

// GET /api/export-logs?type=extra-days&month=YYYY-MM — bisherige Downloads
export async function GET(request: NextRequest) {
  const auth = await requireManager();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const sp = request.nextUrl.searchParams;
  const where: any = { kitaId: auth.user.kitaId };
  if (sp.get('type')) where.type = sp.get('type');
  if (sp.get('month')) where.month = sp.get('month');
  const logs = await prisma.exportLog.findMany({ where, orderBy: { downloadedAt: 'desc' }, take: 100 });
  return NextResponse.json(logs);
}

// POST /api/export-logs — einen Download protokollieren
export async function POST(request: NextRequest) {
  const auth = await requireManager();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await request.json().catch(() => ({}));
  if (!body.type || !body.month) return NextResponse.json({ error: 'type und month erforderlich' }, { status: 400 });
  const log = await prisma.exportLog.create({
    data: { kitaId: auth.user.kitaId!, type: body.type, month: body.month, downloadedBy: auth.user.id },
  });
  return NextResponse.json(log, { status: 201 });
}
