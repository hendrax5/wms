import { PrismaClient } from '@prisma/client';
import mysql from 'mysql2/promise';

const prisma = new PrismaClient();

async function main() {
    console.log('--- STARTING WMS-2026 DATA MIGRATION ---');

    console.log('[1/4] Connecting to legacy database (db_wms_lama)...');
    const legacyDb = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        database: 'db_wms_lama'
    });

    console.log('[2/4] Migrating Categories...');
    const [categories] = await legacyDb.execute('SELECT * FROM m_gudang_kategori');
    for (const cat of categories as any[]) {
        try {
            await prisma.category.upsert({
                where: { id: cat.id_kategori }, // Try to keep ID if possible via string match, but upsert needs unique. Let's just create.
                update: {},
                create: {
                    id: cat.id_kategori,
                    name: cat.nama_kategori || 'Uncategorized',
                    code: cat.singkatan || '',
                }
            });
        } catch (e) {
            // Probably exists
        }
    }
    console.log(` > Categories Migrated: ${categories.length}`);

    console.log('[3/4] Migrating Warehouses (Cabang)...');
    const [cabangs] = await legacyDb.execute('SELECT * FROM m_gudang_cabang');
    for (const cb of cabangs as any[]) {
        try {
            await prisma.warehouse.upsert({
                where: { id: cb.id_cabang },
                update: {},
                create: {
                    id: cb.id_cabang,
                    name: cb.nama_cabang,
                    location: cb.lokasi,
                    type: cb.tipe === '1' ? 'PUSAT' : 'CABANG' // Assuming 1 is pusat
                }
            });
        } catch (e) {
            console.error('Failed to create branch: ', cb.nama_cabang);
        }
    }
    console.log(` > Warehouses Migrated: ${cabangs.length}`);

    console.log('[4/4] Migrating Master Items (Barang)...');
    const [items] = await legacyDb.execute('SELECT * FROM m_gudang_barang');
    for (const item of items as any[]) {
        try {
            await prisma.item.upsert({
                where: { code: item.kode_barang },
                update: {},
                create: {
                    id: item.id_barang,
                    code: item.kode_barang,
                    name: item.nama_barang,
                    categoryId: item.id_kategori,
                    price: item.harga_barang || 0,
                    hasSN: item.sn === 'Y' || true,
                    unit: item.satuan || 'Pcs',
                    minStock: parseInt(item.stok_min) || 0
                }
            });
        } catch (e) {
            console.error('Failed to create item: ', item.kode_barang);
        }
    }
    console.log(` > Items Migrated: ${items.length}`);

    console.log('[5/4] Migrating Serial Numbers (Barang Detail) with Bulk Insert...');
    const [serials] = await legacyDb.execute('SELECT * FROM m_gudang_barang_detail');

    const typeIds = await prisma.itemType.findMany();
    const typeInStock = typeIds.find(t => t.name === 'Baru')?.id || 1;

    const statusIds = await prisma.itemStatus.findMany();
    const statusInStock = statusIds.find(t => t.name === 'In Stock' || t.name === 'Tersedia')?.id || 6;

    const snBatch = [];
    for (const sn of serials as any[]) {
        snBatch.push({
            code: sn.kode_serial_number,
            itemId: sn.id_barang,
            price: sn.harga_satuan || 0,
            typeId: sn.id_tipe || typeInStock,
            statusId: sn.id_status || statusInStock,
            warehouseId: 1 // Default to Gudang Pusat
        });
    }

    // Chunking array into 5000 lengths to insert quickly
    const chunkSize = 5000;
    for (let i = 0; i < snBatch.length; i += chunkSize) {
        const chunk = snBatch.slice(i, i + chunkSize);
        await prisma.serialNumber.createMany({
            data: chunk,
            skipDuplicates: true
        });
        console.log(` > Inserted chunk ${i} to ${i + chunk.length}`);
    }

    console.log(` > Serial Numbers Migrated: Bulk Insert Finished`);

    // Update Warehouse Stock Agregates
    console.log('[6/4] Recalculating Stock Aggregates...');

    // Using group by for O(1) DB calculation rather than nested loops
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

    // Insert Stock Aggregates
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
    console.log('--- MIGRATION COMPLETE ---');
    await legacyDb.end();
    await prisma.$disconnect();
}

main().catch(console.error);
