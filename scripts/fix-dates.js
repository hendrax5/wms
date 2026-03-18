const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    await p.$executeRawUnsafe("SET sql_mode = ''");
    const tables = [
      'serialnumber', 'warehousestock', 'area', 'category', 'company',
      'item', 'user', 'warehouse', 'pop', 'distributor',
      'stockrequest', 'stocktransfer', 'purchaseorder'
    ];
    for (const t of tables) {
      try {
        const r = await p.$executeRawUnsafe(
          `UPDATE \`${t}\` SET updatedAt = COALESCE(createdAt, NOW()) WHERE updatedAt = '0000-00-00 00:00:00' OR updatedAt < '1970-01-02'`
        );
        if (r > 0) console.log(`   Fixed ${r} rows in ${t}`);
      } catch (e) {
        // Table might not have updatedAt/createdAt column, skip
      }
    }
    console.log('==> Datetime fix complete.');
  } catch (e) {
    console.error('==> [WARN] datetime fix failed:', e.message);
  } finally {
    await p.$disconnect();
  }
})();
