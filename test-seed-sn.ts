import { prisma } from './src/lib/db';

async function seedTestData() {
  console.log('Generating dummy Serial Number for testing Scan-to-Deploy...');
  
  const warehouse = await prisma.warehouse.findFirst();
  const item = await prisma.item.findFirst();
  const itemType = await prisma.itemType.findFirst({ where: { name: 'Baru' } });
  const itemStatus = await prisma.itemStatus.findFirst({ where: { name: 'In Stock' } });

  if (!warehouse || !item || !itemType || !itemStatus) {
    console.error('Missing master data! Run npm run seed first.');
    process.exit(1);
  }

  // Generate 3 SNs
  for (let i = 1; i <= 3; i++) {
    const code = `SN-TEST-2026-${i}`;
    await prisma.serialNumber.upsert({
      where: { code },
      update: {
        warehouseId: warehouse.id,
        statusId: itemStatus.id,
        updatedAt: new Date()
      },
      create: {
        code,
        itemId: item.id,
        typeId: itemType.id,
        statusId: itemStatus.id,
        warehouseId: warehouse.id,
        price: 1500000,
        updatedAt: new Date()
      }
    });
    console.log(`Created SN: ${code} at ${warehouse.name}`);
  }

  // Ensure stock is sufficient
  await prisma.warehouseStock.upsert({
    where: {
      itemId_warehouseId: {
         itemId: item.id,
         warehouseId: warehouse.id
      }
    },
    update: {
      stockNew: { increment: 3 },
      updatedAt: new Date()
    },
    create: {
      itemId: item.id,
      warehouseId: warehouse.id,
      stockNew: 10,
      updatedAt: new Date()
    }
  });

  console.log('Done!');
}

seedTestData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
