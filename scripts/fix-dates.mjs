// Fix invalid 0000-00-00 datetime values in the database
// This runs on container startup before the app starts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDates() {
    console.log("==> Fixing invalid datetime values (0000-00-00)...");
    try {
        // Set SQL mode to allow reading 0000-00-00 dates
        await prisma.$executeRawUnsafe(`SET sql_mode = ''`);

        const tables = [
            { table: 'serialnumber', fallback: 'createdAt' },
            { table: 'warehousestock', fallback: null },
            { table: 'area', fallback: 'createdAt' },
            { table: 'category', fallback: 'createdAt' },
            { table: 'company', fallback: 'createdAt' },
            { table: 'item', fallback: 'createdAt' },
            { table: 'user', fallback: 'createdAt' },
            { table: 'warehouse', fallback: 'createdAt' },
            { table: 'pop', fallback: 'createdAt' },
            { table: 'distributor', fallback: 'createdAt' },
            { table: 'stockrequest', fallback: 'createdAt' },
            { table: 'stocktransfer', fallback: 'createdAt' },
            { table: 'purchaseorder', fallback: 'createdAt' },
        ];

        for (const { table, fallback } of tables) {
            try {
                const setVal = fallback ? `\`${fallback}\`` : 'NOW()';
                const result = await prisma.$executeRawUnsafe(
                    `UPDATE \`${table}\` SET updatedAt = ${setVal} WHERE updatedAt = '0000-00-00 00:00:00' OR updatedAt < '1970-01-02'`
                );
                if (result > 0) {
                    console.log(`   Fixed ${result} rows in ${table}`);
                }
            } catch (e) {
                // Table might not have updatedAt column, skip silently
            }
        }

        console.log("==> Datetime fix complete.");
    } catch (e) {
        console.error("==> [WARN] datetime fix failed:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

fixDates();
