import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const now = new Date();

        // 1. Stok di bawah minimum
        const lowStock = await prisma.warehouseStock.findMany({
            where: {
                OR: [
                    { stockNew: { lte: prisma.warehouseStock.fields.minStock as any } },
                ]
            },
            include: { item: true, warehouse: true },
            take: 20,
        }).catch(() => []);

        // Query manual untuk low stock karena Prisma tak mendukung field comparisons
        const allStocks = await prisma.warehouseStock.findMany({
            include: { item: true, warehouse: true },
            where: { minStock: { gt: 0 } }
        });
        const lowStockItems = allStocks.filter(s =>
            (s.stockNew + s.stockDismantle) <= s.minStock
        ).slice(0, 10);

        // 2. Maintenance overdue
        const overdueMaintenances = await (prisma as any).assetMaintenanceLog.findMany({
            where: {
                status: 'SCHEDULED',
                scheduledDate: { lt: now }
            },
            include: {
                asset: { include: { item: true } },
                technician: true,
            },
            take: 10,
            orderBy: { scheduledDate: 'asc' }
        });

        // 3. Aset baru di-deploy dalam 7 hari terakhir
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentAssets = await (prisma as any).asset.findMany({
            where: {
                status: 'ACTIVE',
                createdAt: { gte: sevenDaysAgo }
            },
            include: { item: true, user: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });

        const notifications: any[] = [];

        // Build notification items
        lowStockItems.forEach(s => {
            notifications.push({
                id: `low-${s.id}`,
                type: 'LOW_STOCK',
                severity: (s.stockNew + s.stockDismantle) === 0 ? 'critical' : 'warning',
                title: `Stok Rendah: ${s.item.name}`,
                message: `${s.warehouse.name} — Sisa ${s.stockNew + s.stockDismantle} unit (min: ${s.minStock})`,
                link: '/stock',
                createdAt: new Date().toISOString(),
            });
        });

        overdueMaintenances.forEach((m: any) => {
            const daysLate = Math.floor((now.getTime() - new Date(m.scheduledDate).getTime()) / (1000 * 60 * 60 * 24));
            notifications.push({
                id: `maint-${m.id}`,
                type: 'MAINTENANCE_OVERDUE',
                severity: 'critical',
                title: `Maintenance Terlambat: ${m.asset?.item?.name}`,
                message: `Dijadwalkan ${new Date(m.scheduledDate).toLocaleDateString('id-ID')} — Terlambat ${daysLate} hari`,
                link: '/assets/maintenance',
                createdAt: m.scheduledDate,
            });
        });

        recentAssets.forEach((a: any) => {
            notifications.push({
                id: `asset-${a.id}`,
                type: 'NEW_ASSET',
                severity: 'info',
                title: `Aset Baru Ter-deploy: ${a.item?.name}`,
                message: `Dipasang oleh ${a.user?.name || 'Teknisi'} — ${new Date(a.createdAt).toLocaleDateString('id-ID')}`,
                link: `/assets/${a.id}`,
                createdAt: a.createdAt,
            });
        });

        // Sort by severity: critical first
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        notifications.sort((a, b) =>
            (severityOrder[a.severity as keyof typeof severityOrder] ?? 3) -
            (severityOrder[b.severity as keyof typeof severityOrder] ?? 3)
        );

        return NextResponse.json({
            total: notifications.length,
            critical: notifications.filter(n => n.severity === 'critical').length,
            notifications,
        });

    } catch (error: any) {
        console.error('[GET /api/notifications]', error);
        return NextResponse.json({ total: 0, critical: 0, notifications: [] });
    }
}
