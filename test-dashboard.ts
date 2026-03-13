import { prisma } from './src/lib/db';

async function testDashboard() {
    const [
        totalItems,
        stocks,
        totalSN,
        stockInToday,
        stockOutToday
    ] = await Promise.all([
        prisma.item.count(),
        prisma.warehouseStock.findMany({ select: { stockNew: true, stockDismantle: true, stockDamaged: true } }),
        prisma.serialNumber.count({ where: { warehouseId: { not: null } } }),
        prisma.stockIn.count({
            where: {
                createdAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    lte: new Date(new Date().setHours(23, 59, 59, 999))
                }
            }
        }),
        prisma.stockOut.count({
            where: {
                createdAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    lte: new Date(new Date().setHours(23, 59, 59, 999))
                }
            }
        })
    ]);

    const totalFisik = stocks.reduce((acc, curr) => acc + curr.stockNew + curr.stockDismantle + curr.stockDamaged, 0);

    console.log('✅ Dashboard Stats:');
    console.log('  Total Items:', totalItems);
    console.log('  Total Fisik:', totalFisik);
    console.log('  Total SN:', totalSN);
    console.log('  Trx Today:', stockInToday + stockOutToday);
    await prisma.$disconnect();
}

testDashboard().catch(e => { console.error('❌ ERROR:', e.message); process.exit(1); });
