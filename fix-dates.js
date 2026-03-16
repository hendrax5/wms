const mysql = require('mysql2/promise');

async function fixDates() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'wmspassword',
    database: 'wms_2026'
  });

  console.log('Connected to Database. Fixing 0000 dates...');
  
  // Disable strict mode so we can read and write the zero dates if needed
  await connection.query("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'NO_ZERO_DATE',''));");
  await connection.query("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'NO_ZERO_IN_DATE',''));");

  const tables = [
    'area', 'category', 'company', 'distributor', 'item', 'pop', 
    'purchaseorder', 'serialnumber', 'stockrequest', 'stocktransfer', 
    'user', 'warehouse', 'warehousestock'
  ];

  for (const table of tables) {
    try {
      const [result] = await connection.query(`UPDATE ?? SET updatedAt = '2026-01-01 00:00:00' WHERE updatedAt < '1970-01-01 00:00:00' OR updatedAt IS NULL OR updatedAt = '0000-00-00 00:00:00'`, [table]);
      console.log(`Table ${table}: Fixed ${result.affectedRows} rows.`);
      
      // Also fix createdAt if it exists
      const [res2] = await connection.query(`UPDATE ?? SET createdAt = '2026-01-01 00:00:00' WHERE createdAt < '1970-01-01 00:00:00' OR createdAt IS NULL OR createdAt = '0000-00-00 00:00:00'`, [table]).catch(() => [{affectedRows: 0}]);
      if(res2 && res2.affectedRows > 0) {
        console.log(`Table ${table} (createdAt): Fixed ${res2.affectedRows} rows.`);
      }
    } catch (e) {
      console.log(`Skipping table ${table}: ${e.message}`);
    }
  }

  await connection.end();
}

fixDates().catch(console.error);
