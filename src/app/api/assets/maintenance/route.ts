import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { assetId, technicianId, scheduledDate, findings } = body;

        if (!assetId || !technicianId || !scheduledDate) {
            return NextResponse.json({ error: 'Field wajib tidak lengkap' }, { status: 400 });
        }

        const log = await (prisma as any).assetMaintenanceLog.create({
            data: {
                assetId: parseInt(assetId),
                technicianId: parseInt(technicianId),
                scheduledDate: new Date(scheduledDate),
                findings: findings || null,
                status: 'SCHEDULED',
            }
        });

        return NextResponse.json({ success: true, log });
    } catch (error: any) {
        console.error('[POST /api/assets/maintenance]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
