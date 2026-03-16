import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const sn = searchParams.get('sn');

    if (!sn) {
        return NextResponse.json({ error: 'Serial Number diperlukan' }, { status: 400 });
    }

    try {
        const { prisma } = await import('@/lib/db');

        const serialNumber = await (prisma as any).serialNumber.findFirst({
            where: { code: sn },
            include: {
                asset: {
                    include: {
                        item: { include: { category: true } },
                        user: true,
                    }
                }
            }
        });

        if (!serialNumber || !serialNumber.asset) {
            return NextResponse.json({ error: `Serial Number "${sn}" tidak ditemukan atau belum ter-deploy sebagai aset` }, { status: 404 });
        }

        const asset = serialNumber.asset;
        return NextResponse.json({
            assetId: asset.id,
            itemName: asset.item?.name ?? '—',
            category: asset.item?.category?.name ?? '—',
            serialCode: serialNumber.code,
            status: asset.status,
            installedAt: asset.installedAt,
            technicianName: asset.user?.name ?? 'Tidak Diketahui',
        });
    } catch (error: any) {
        console.error('[GET /api/assets/scan-by-sn]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
