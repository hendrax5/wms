import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
    const sn = await prisma.serialNumber.findMany({
        where: { code: { contains: "D017-2512027220" } },
        include: { warehouse: true, item: true }
    });
    console.log(JSON.stringify(sn, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
