import { vi, describe, it, expect, beforeEach } from 'vitest';
import { prismaMock } from '@/lib/db.mock';
import { createReturn } from '../return';

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

vi.mock('../audit', () => ({
    logAudit: vi.fn(),
}));

describe('Return Action: createReturn', () => {
    beforeEach(() => {
        prismaMock.$transaction.mockImplementation(async (cb) => {
            if (typeof cb === 'function') {
                return cb(prismaMock);
            }
            return cb;
        });
    });

    it('should return error if no items are provided', async () => {
        const payload = {
            targetWarehouseId: 1,
            returnSource: 'POP' as const,
            sourcePopId: 10,
            items: [],
        };

        const result = await createReturn(payload);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Minimal 1 barang harus ditambahkan.');
    });

    it('should successfully process a non-serial item return with DISMANTLE condition', async () => {
        const payload = {
            targetWarehouseId: 1,
            returnSource: 'POP' as const,
            sourcePopId: 10,
            items: [{ itemId: 100, qty: 5, condition: 'DISMANTLE' as const, serialNumbers: [] }],
            techName: 'Budi'
        };

        prismaMock.itemStatus.upsert.mockResolvedValue({ id: 1, name: 'In Stock' } as any);
        prismaMock.itemType.upsert.mockResolvedValueOnce({ id: 2, name: 'Dismantle' } as any);
        prismaMock.itemType.upsert.mockResolvedValueOnce({ id: 1, name: 'Baru' } as any);
        prismaMock.pop.findUnique.mockResolvedValue({ id: 10, name: 'POP JKT' } as any);
        
        prismaMock.stockIn.create.mockResolvedValue({ id: 500 } as any);
        
        prismaMock.warehouseStock.findUnique.mockResolvedValue({
            id: 1000,
            warehouseId: 1,
            itemId: 100,
            stockNew: 10,
            stockDismantle: 0,
            stockDamaged: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const result = await createReturn(payload);
        
        expect(result.success).toBe(true);
        
        // Ensure stockDismantle is incremented because condition is DISMANTLE
        expect(prismaMock.warehouseStock.update).toHaveBeenCalledWith({
            where: { id: 1000 },
            data: {
                stockNew: { increment: 0 },
                stockDismantle: { increment: 5 },
                stockDamaged: { increment: 0 },
                updatedAt: expect.any(Date)
            }
        });
    });

    it('should successfully process a serial-numbered item return with DAMAGED condition', async () => {
        const payload = {
            targetWarehouseId: 1,
            returnSource: 'CUSTOMER' as const,
            sourceCustomerName: 'PT Jaya',
            items: [{ itemId: 100, qty: 1, condition: 'DAMAGED' as const, serialNumbers: ['SN-1'] }],
        };

        prismaMock.itemStatus.upsert.mockResolvedValue({ id: 1, name: 'In Stock' } as any);
        prismaMock.itemType.upsert.mockResolvedValueOnce({ id: 2, name: 'Dismantle' } as any);
        prismaMock.itemType.upsert.mockResolvedValueOnce({ id: 1, name: 'Baru' } as any);
        
        prismaMock.stockIn.create.mockResolvedValue({ id: 500 } as any);
        
        prismaMock.serialNumber.findUnique.mockResolvedValue({
            id: 2000,
            code: 'SN-1',
            itemId: 100,
            warehouseId: null
        } as any);

        prismaMock.warehouseStock.findUnique.mockResolvedValue(null);

        const result = await createReturn(payload);
        
        expect(result.success).toBe(true);
        
        // SN typeId is set to Dismantle for DAMAGED condition according to business logic in return.ts
        expect(prismaMock.serialNumber.update).toHaveBeenCalledWith({
            where: { id: 2000 },
            data: {
                warehouseId: 1,
                popId: null,
                customerId: null,
                statusId: 1,
                typeId: 2, // typeDismantle.id since condition is not NEW
                updatedAt: expect.any(Date)
            }
        });

        // Ensure stockDamaged is set to 1 in new warehouseStock record
        expect(prismaMock.warehouseStock.create).toHaveBeenCalledWith({
            data: {
                itemId: 100,
                warehouseId: 1,
                stockNew: 0,
                stockDismantle: 0,
                stockDamaged: 1,
                updatedAt: expect.any(Date)
            }
        });
    });
});
