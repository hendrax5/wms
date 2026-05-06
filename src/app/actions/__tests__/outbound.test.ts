import { vi, describe, it, expect, beforeEach } from 'vitest';
import { prismaMock } from '@/lib/db.mock';
import { createInstallation } from '../outbound';

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

vi.mock('../audit', () => ({
    logAudit: vi.fn(),
}));

describe('Outbound Action: createInstallation', () => {
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
            sourceWarehouseId: 1,
            items: [],
            installType: 'POP' as const,
            targetPopId: 2,
        };

        const result = await createInstallation(payload);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Minimal 1 barang harus ditambahkan.');
    });

    it('should handle non-serial item successfully (defaults to stockNew)', async () => {
        const payload = {
            sourceWarehouseId: 1,
            items: [{ itemId: 10, qty: 5, serialNumbers: [] }],
            installType: 'POP' as const,
            targetPopId: 2,
        };

        prismaMock.itemStatus.upsert.mockResolvedValue({ id: 1, name: 'Dipakai' } as any);
        prismaMock.itemType.upsert.mockResolvedValueOnce({ id: 1, name: 'Baru' } as any);
        prismaMock.itemType.upsert.mockResolvedValueOnce({ id: 2, name: 'Dismantle' } as any);
        
        prismaMock.warehouseStock.findUnique.mockResolvedValue({
            id: 100,
            warehouseId: 1,
            itemId: 10,
            stockNew: 10,
            stockDismantle: 0,
            stockDamaged: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        prismaMock.stockOut.create.mockResolvedValue({ id: 200 } as any);
        
        const result = await createInstallation(payload);
        
        expect(result.success).toBe(true);
        expect(prismaMock.warehouseStock.update).toHaveBeenCalledWith({
            where: { id: 100 },
            data: {
                stockNew: { decrement: 5 },
                stockDismantle: { decrement: 0 },
                stockDamaged: { decrement: 0 },
                updatedAt: expect.any(Date)
            }
        });
    });

    it('should properly calculate stock decrements for mixed serial number types', async () => {
        const payload = {
            sourceWarehouseId: 1,
            items: [{ itemId: 10, qty: 2, serialNumbers: ['SN-NEW-1', 'SN-DISMANTLE-1'] }],
            installType: 'POP' as const,
            targetPopId: 2,
        };

        prismaMock.itemStatus.upsert.mockResolvedValue({ id: 1, name: 'Dipakai' } as any);
        // First is Baru, Second is Dismantle
        prismaMock.itemType.upsert.mockResolvedValueOnce({ id: 1, name: 'Baru' } as any);
        prismaMock.itemType.upsert.mockResolvedValueOnce({ id: 2, name: 'Dismantle' } as any);
        
        prismaMock.warehouseStock.findUnique.mockResolvedValue({
            id: 100,
            warehouseId: 1,
            itemId: 10,
            stockNew: 5,
            stockDismantle: 5,
            stockDamaged: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        prismaMock.serialNumber.findUnique.mockImplementation((args: any) => {
            if (args.where.code === 'SN-NEW-1') {
                return Promise.resolve({ id: 1001, code: 'SN-NEW-1', typeId: 1, warehouseId: 1 } as any);
            } else if (args.where.code === 'SN-DISMANTLE-1') {
                return Promise.resolve({ id: 1002, code: 'SN-DISMANTLE-1', typeId: 2, warehouseId: 1 } as any);
            }
            return Promise.resolve(null);
        });

        prismaMock.stockOut.create.mockResolvedValue({ id: 200 } as any);
        
        const result = await createInstallation(payload);
        
        expect(result.success).toBe(true);
        
        // It should decrement 1 from stockNew and 1 from stockDismantle
        expect(prismaMock.warehouseStock.update).toHaveBeenCalledWith({
            where: { id: 100 },
            data: {
                stockNew: { decrement: 1 },
                stockDismantle: { decrement: 1 },
                stockDamaged: { decrement: 0 },
                updatedAt: expect.any(Date)
            }
        });

        // It should update both SNs
        expect(prismaMock.serialNumber.update).toHaveBeenCalledTimes(2);
        expect(prismaMock.stockOutSerial.create).toHaveBeenCalledTimes(2);
        expect(prismaMock.popInstallation.create).toHaveBeenCalledTimes(2);
    });

    it('should return error if stock is insufficient based on SN types', async () => {
        const payload = {
            sourceWarehouseId: 1,
            items: [{ itemId: 10, qty: 1, serialNumbers: ['SN-DISMANTLE-1'] }],
            installType: 'POP' as const,
            targetPopId: 2,
        };

        prismaMock.itemStatus.upsert.mockResolvedValue({ id: 1, name: 'Dipakai' } as any);
        prismaMock.itemType.upsert.mockResolvedValueOnce({ id: 1, name: 'Baru' } as any);
        prismaMock.itemType.upsert.mockResolvedValueOnce({ id: 2, name: 'Dismantle' } as any);
        
        // Not enough dismantle stock
        prismaMock.warehouseStock.findUnique.mockResolvedValue({
            id: 100,
            warehouseId: 1,
            itemId: 10,
            stockNew: 10,
            stockDismantle: 0,
            stockDamaged: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        prismaMock.serialNumber.findUnique.mockResolvedValue({ 
            id: 1002, 
            code: 'SN-DISMANTLE-1', 
            typeId: 2, 
            warehouseId: 1 
        } as any);
        
        prismaMock.item.findUnique.mockResolvedValue({ id: 10, name: 'Test Item' } as any);

        const result = await createInstallation(payload);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Stok "Test Item" tidak mencukupi');
    });
});
