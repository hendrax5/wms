import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting DB Seed...')

    // 1. Setup Admin Area
    const areaPusat = await prisma.area.upsert({
        where: { name: 'JABODETABEK' },
        update: {},
        create: {
            name: 'JABODETABEK',
            updatedAt: new Date(),
        },
    })

    // 2. Setup Warehouse Pusat
    // NOTE: Warehouse.name is NOT @unique, use findFirst+create
    let warehousePusat = await prisma.warehouse.findFirst({
        where: { name: 'Gudang Pusat Jakarta' },
    })
    if (!warehousePusat) {
        warehousePusat = await prisma.warehouse.create({
            data: {
                name: 'Gudang Pusat Jakarta',
                type: 'PUSAT',
                areaId: areaPusat.id,
                location: 'Jakarta',
                updatedAt: new Date(),
            },
        })
    }

    // 3. Setup Master Admin User
    const passwordHash = await bcrypt.hash('!Tahun2026', 10)

    const masterUser = await prisma.user.upsert({
        where: { username: 'hendra@servicex.id' },
        update: {},
        create: {
            username: 'hendra@servicex.id',
            password: passwordHash,
            name: 'Hendra',
            level: 'MASTER',
            isActive: true,
            warehouseId: warehousePusat.id,
            jabatan: 'System Administrator',
            updatedAt: new Date(),
        },
    })

    // 4. Setup Categories
    // NOTE: Category.name is NOT @unique, use findFirst+create
    const categories = ['SWITCH', 'ROUTER', 'SFP', 'ONT', 'CABLE', 'ACCESSORY']
    for (const cat of categories) {
        const existingCat = await prisma.category.findFirst({ where: { name: cat } })
        if (!existingCat) {
            await prisma.category.create({
                data: { name: cat, hasSN: true, updatedAt: new Date() },
            })
        }
    }

    // 5. Setup Item Types and Statuses
    const itemTypes = ['Baru', 'Dismantle', 'Rusak', 'Return', 'Awal']
    for (const type of itemTypes) {
        await prisma.itemType.upsert({
            where: { name: type },
            update: {},
            create: { name: type },
        })
    }

    const itemStatuses = ['Belum disetujui', 'Disetujui', 'Ditolak', 'On Progress', 'Di Return', 'In Stock', 'Dipakai', 'Rusak']
    for (const status of itemStatuses) {
        await prisma.itemStatus.upsert({
            where: { name: status },
            update: {},
            create: { name: status },
        })
    }

    // 6. Setup Sample Default Item
    const switchCat = await prisma.category.findFirst({ where: { name: 'SWITCH' } })

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
                updatedAt: new Date(),
            }
        })
    }

    console.log(`Seed successfully finished! Created Master user: ${masterUser.username}`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
