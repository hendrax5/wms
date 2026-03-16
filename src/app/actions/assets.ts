import { prisma } from '@/lib/db';

export async function getAssets() {
    try {
        const assets = await (prisma as any).asset.findMany({
            include: {
                item: true,
                serialnumber: {
                    include: {
                        itemstatus: true,
                        warehouse: true,
                    }
                },
                user: true,
                maintenancelogs: {
                    orderBy: { scheduledDate: 'desc' },
                    take: 1,
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return assets;
    } catch (e) {
        console.error('getAssets error:', e);
        return [];
    }
}

export async function getAssetById(id: number) {
    try {
        const asset = await (prisma as any).asset.findUnique({
            where: { id },
            include: {
                item: { include: { category: true } },
                serialnumber: {
                    include: {
                        itemstatus: true,
                        warehouse: true,
                    }
                },
                user: true,
                maintenancelogs: {
                    include: { technician: true },
                    orderBy: { scheduledDate: 'desc' }
                },
                depreciations: {
                    orderBy: { periodDate: 'desc' }
                }
            }
        });
        return asset;
    } catch (e) {
        console.error('getAssetById error:', e);
        return null;
    }
}

export async function getAssetStats() {
    try {
        const [active, maintenance, damaged, decommissioned] = await Promise.all([
            (prisma as any).asset.count({ where: { status: 'ACTIVE' } }),
            (prisma as any).asset.count({ where: { status: 'MAINTENANCE' } }),
            (prisma as any).asset.count({ where: { status: 'DAMAGED' } }),
            (prisma as any).asset.count({ where: { status: 'DECOMMISSIONED' } }),
        ]);
        return { active, maintenance, damaged, decommissioned, total: active + maintenance + damaged + decommissioned };
    } catch (e) {
        console.error('getAssetStats error:', e);
        return { active: 0, maintenance: 0, damaged: 0, decommissioned: 0, total: 0 };
    }
}

export async function getMaintenanceSchedule() {
    try {
        const logs = await (prisma as any).assetMaintenanceLog.findMany({
            where: {
                status: { in: ['SCHEDULED', 'OVERDUE'] }
            },
            include: {
                asset: {
                    include: { item: true, serialnumber: true }
                },
                technician: true,
            },
            orderBy: { scheduledDate: 'asc' }
        });
        return logs;
    } catch (e) {
        console.error('getMaintenanceSchedule error:', e);
        return [];
    }
}

export async function getAllMaintenanceLogs() {
    try {
        const logs = await (prisma as any).assetMaintenanceLog.findMany({
            include: {
                asset: {
                    include: { item: true, serialnumber: true }
                },
                technician: true,
            },
            orderBy: { scheduledDate: 'desc' }
        });
        return logs;
    } catch (e) {
        console.error('getAllMaintenanceLogs error:', e);
        return [];
    }
}

export async function getTechnicians() {
    try {
        const users = await prisma.user.findMany({
            where: { isActive: true },
            select: { id: true, name: true, jabatan: true }
        });
        return users;
    } catch (e) {
        return [];
    }
}
