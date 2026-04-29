/**
 * Reset Admin Password Script
 * 
 * Resets or creates the admin user with specified credentials.
 * Usage: node scripts/reset-admin.js [username] [password]
 * 
 * Examples:
 *   node scripts/reset-admin.js                     → reset admin / !Tahun2026
 *   node scripts/reset-admin.js myuser mypass123     → reset myuser / mypass123
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const username = process.argv[2] || process.env.SEED_ADMIN_USERNAME || 'admin';
const password = process.argv[3] || process.env.SEED_ADMIN_PASSWORD || '!Tahun2026';

async function main() {
    console.log(`==> Resetting admin user: ${username}`);

    const passwordHash = await bcrypt.hash(password, 10);

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { username } });

    if (existing) {
        // Update password
        await prisma.user.update({
            where: { username },
            data: { 
                password: passwordHash,
                isActive: true,
            },
        });
        console.log(`  ✓ Password updated for existing user: ${username}`);
    } else {
        // Get or create a warehouse for the user
        let warehouse = await prisma.warehouse.findFirst();
        if (!warehouse) {
            const area = await prisma.area.upsert({
                where: { name: 'JABODETABEK' },
                update: {},
                create: { name: 'JABODETABEK' },
            });
            warehouse = await prisma.warehouse.create({
                data: {
                    name: 'Gudang Pusat Jakarta',
                    type: 'PUSAT',
                    areaId: area.id,
                    location: 'Jakarta',
                },
            });
        }

        await prisma.user.create({
            data: {
                username,
                password: passwordHash,
                name: 'Administrator',
                level: 'MASTER',
                isActive: true,
                warehouseId: warehouse.id,
                jabatan: 'System Administrator',
            },
        });
        console.log(`  ✓ Created new MASTER user: ${username}`);
    }

    // Also list all users for debugging
    const users = await prisma.user.findMany({
        select: { id: true, username: true, level: true, isActive: true },
    });
    console.log('');
    console.log('  All users in database:');
    users.forEach(u => {
        console.log(`    ${u.id}: ${u.username} (${u.level}) ${u.isActive ? '✓' : '✗ INACTIVE'}`);
    });

    console.log('');
    console.log('══════════════════════════════════════════');
    console.log(`  Login: ${username} / ${password}`);
    console.log('══════════════════════════════════════════');
}

main()
    .catch(e => { console.error('ERROR:', e.message); process.exit(1); })
    .finally(() => prisma.$disconnect());
