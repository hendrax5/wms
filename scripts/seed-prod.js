/**
 * Production Seed Script (seed-prod.js)
 * 
 * Runs inside the Docker container at first boot.
 * Idempotent — only seeds when zero users exist in the database.
 * 
 * Uses CommonJS so it works without tsx in the production standalone build.
 * bcryptjs is copied into the production image via Dockerfile.
 * 
 * Usage: node scripts/seed-prod.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = '!Tahun2026';

async function main() {
    console.log('==> Running production seed...');

    // ── Guard: skip if database already has users ──
    const userCount = await prisma.user.count();
    if (userCount > 0) {
        console.log(`==> Database already has ${userCount} user(s), skipping seed.`);
        return;
    }

    console.log('==> No users found. Seeding initial data...');

    // 1. Area
    const area = await prisma.area.upsert({
        where: { name: 'JABODETABEK' },
        update: {},
        create: { name: 'JABODETABEK' },
    });
    console.log('  ✓ Area: JABODETABEK');

    // 2. Warehouse
    let warehouse = await prisma.warehouse.findFirst({ where: { name: 'Gudang Pusat Jakarta' } });
    if (!warehouse) {
        warehouse = await prisma.warehouse.create({
            data: {
                name: 'Gudang Pusat Jakarta',
                type: 'PUSAT',
                areaId: area.id,
                location: 'Jakarta',
            },
        });
    }
    console.log('  ✓ Warehouse: Gudang Pusat Jakarta');

    // 3. Master User
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    await prisma.user.upsert({
        where: { username: DEFAULT_USERNAME },
        update: {},
        create: {
            username: DEFAULT_USERNAME,
            password: passwordHash,
            name: 'Administrator',
            level: 'MASTER',
            isActive: true,
            warehouseId: warehouse.id,
            jabatan: 'System Administrator',
        },
    });
    console.log(`  ✓ User: ${DEFAULT_USERNAME} / ${DEFAULT_PASSWORD} (MASTER)`);

    // 4. Categories
    const categories = ['SWITCH', 'ROUTER', 'SFP', 'ONT', 'CABLE', 'ACCESSORY'];
    for (const name of categories) {
        const existing = await prisma.category.findFirst({ where: { name } });
        if (!existing) {
            await prisma.category.create({ data: { name } });
        }
    }
    console.log(`  ✓ Categories: ${categories.join(', ')}`);

    // 5. Item Types
    const itemTypes = ['Baru', 'Dismantle', 'Rusak', 'Return', 'Awal'];
    for (const name of itemTypes) {
        await prisma.itemType.upsert({
            where: { name },
            update: {},
            create: { name },
        });
    }
    console.log(`  ✓ Item Types: ${itemTypes.join(', ')}`);

    // 6. Item Statuses
    const itemStatuses = ['Belum disetujui', 'Disetujui', 'Ditolak', 'On Progress', 'Di Return', 'In Stock', 'Dipakai', 'Rusak'];
    for (const name of itemStatuses) {
        await prisma.itemStatus.upsert({
            where: { name },
            update: {},
            create: { name },
        });
    }
    console.log(`  ✓ Item Statuses: ${itemStatuses.length} entries`);

    // 7. Sample Item
    const switchCat = await prisma.category.findFirst({ where: { name: 'SWITCH' } });
    if (switchCat) {
        await prisma.item.upsert({
            where: { code: 'SW-RB4011' },
            update: {},
            create: {
                code: 'SW-RB4011',
                name: 'Mikrotik RB4011',
                hasSN: true,
                minStock: 5,
                categoryId: switchCat.id,
            },
        });
        console.log('  ✓ Sample Item: Mikrotik RB4011');
    }

    console.log('');
    console.log('══════════════════════════════════════════');
    console.log('  ✅ Seed selesai!');
    console.log('');
    console.log('  Login dengan:');
    console.log(`    Username : ${DEFAULT_USERNAME}`);
    console.log(`    Password : ${DEFAULT_PASSWORD}`);
    console.log('');
    console.log('  ⚠️  Segera ganti password setelah login!');
    console.log('══════════════════════════════════════════');
}

main()
    .catch((e) => {
        console.error('==> [ERROR] Seed failed:', e.message);
        // Non-fatal — don't crash the container
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
