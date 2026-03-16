import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id);
        const body = await req.json();
        const { status, completedDate, actionTaken } = body;

        const updated = await (prisma as any).assetMaintenanceLog.update({
            where: { id },
            data: {
                status,
                completedDate: completedDate ? new Date(completedDate) : undefined,
                actionTaken: actionTaken || null,
            }
        });

        return NextResponse.json({ success: true, log: updated });
    } catch (error: any) {
        console.error('[PATCH /api/assets/maintenance/[id]]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
