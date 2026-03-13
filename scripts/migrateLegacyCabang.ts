import { PrismaClient } from '@prisma/client';
import mysql from 'mysql2/promise';

const prisma = new PrismaClient();

async function main() {
    console.log('--- STARTING WMS-2026 DATA MIGRATION (PART 2 - CABANG) ---');

    const legacyDb = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        database: 'db_wms_lama'
    });

    console.log('[1/2] Migrating Branch Serial Numbers (Cabang Barang Detail)...');
    const [cabangSerials] = await legacyDb.execute('SELECT * FROM m_gudang_cabang_barang_detail');

    const typeIds = await prisma.itemType.findMany();
    const typeInStock = typeIds.find(t => t.name === 'Baru')?.id || 1;

    const statusIds = await prisma.itemStatus.findMany();
    const statusInStock = statusIds.find(t => t.name === 'In Stock' || t.name === 'Tersedia')?.id || 6;

    const validTypes = typeIds.map(t => t.id);
    const validStatuses = statusIds.map(s => s.id);

    console.log(' > Indexing and bulk processing...');

    // In Prisma, upsertMany doesn't exist natively. To be fast, we will try to createMany. Then we will update the warehouseIds for conflicts using sequential transactions. But upsert loop of 100k can be slow. Let's do a grouped map to update Many iteratively if we need.
    const toCreate = [];
    for (const sn of cabangSerials as any[]) {
        toCreate.push({
            code: sn.kode_serial_number,
            itemId: sn.id_barang,
            price: sn.harga_satuan || 0,
            typeId: validTypes.includes(sn.id_tipe) ? sn.id_tipe : typeInStock,
            statusId: validStatuses.includes(sn.id_status) ? sn.id_status : statusInStock,
            warehouseId: sn.id_cabang
        });
    }

    const chunkSize = 5000;
    for (let i = 0; i < toCreate.length; i += chunkSize) {
        const chunk = toCreate.slice(i, i + chunkSize);

        // Sanitize string quotes
        const values = chunk.map(c => `('${c.code.replace(/'/g, "''")}', ${c.itemId}, ${c.price}, ${c.typeId}, ${c.statusId}, ${c.warehouseId})`).join(', ');

        // IGNORE invalid items but update valid duplicates
        const query = `
            INSERT IGNORE INTO \`SerialNumber\` (\`code\`, \`itemId\`, \`price\`, \`typeId\`, \`statusId\`, \`warehouseId\`)
            VALUES ${values}
            ON DUPLICATE KEY UPDATE \`warehouseId\` = VALUES(\`warehouseId\`)
        `;

        await prisma.$executeRawUnsafe(query);
        console.log(` > Processed chunk ${i} to ${i + chunk.length}`);
    }

    console.log(` > Branch Serial Numbers Migrated: Finished`);

    // Update Warehouse Stock Agregates
    console.log('[2/2] Recalculating Stock Aggregates...');

    const groupedStocks = await prisma.serialNumber.groupBy({
        by: ['warehouseId', 'itemId'],
        _count: {
            id: true
        },
        where: {
            warehouseId: { not: null }
        }
    });

    const stockBatch = groupedStocks.map(g => ({
        warehouseId: g.warehouseId as number,
        itemId: g.itemId,
        stockNew: g._count.id
    }));

    let insertCount = 0;
    for (const stock of stockBatch) {
        await prisma.warehouseStock.upsert({
            where: {
                itemId_warehouseId: {
                    itemId: stock.itemId,
                    warehouseId: stock.warehouseId
                }
            },
            update: { stockNew: stock.stockNew },
            create: stock
        });
        insertCount++;
    }

    console.log(` > Recalculated ${insertCount} stock aggregation records`);
    console.log('--- PART 2 MIGRATION COMPLETE ---');
    await legacyDb.end();
    await prisma.$disconnect();
}

main().catch(console.error);
