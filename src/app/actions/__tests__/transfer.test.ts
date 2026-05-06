import { vi, describe, it, expect, beforeEach } from 'vitest';
import { prismaMock } from '@/lib/db.mock';
import { createTransfer } from '../transfer';

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

vi.mock('../audit', () => ({
    logAudit: vi.fn(),
}));

describe('Transfer Action: createTransfer', () => {
    beforeEach(() => {
        prismaMock.$transaction.mockImplementation(async (cb) => {
            if (typeof cb === 'function') {
                return cb(prismaMock);
            }
            return cb;
        });
    });

    it('should return error if source and target warehouse are the same', async () => {
        const payload = {
            sourceWarehouseId: 1,
            targetWarehouseId: 1,
            itemId: 10,
            qty: 5,
            serialNumbers: []
        };

        const result = await createTransfer(payload);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Gudang asal dan tujuan tidak boleh sama.');
    });

    it('should return error if SN length does not match qty', async () => {
        const payload = {
            sourceWarehouseId: 1,
            targetWarehouseId: 2,
            itemId: 10,
            qty: 5,
            serialNumbers: ['SN-1', 'SN-2']
        };

        const result = await createTransfer(payload);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Jumlah Serial Number tidak sesuai dengan Qty Transfer.');
    });

    it('should handle non-serial item transfer successfully', async () => {
        const payload = {
            sourceWarehouseId: 1,
            targetWarehouseId: 2,
            itemId: 10,
            qty: 5,
            serialNumbers: []
        };

        prismaMock.itemType.upsert.mockResolvedValueOnce({ id: 1, name: 'Baru' } as any);
        prismaMock.itemType.upsert.mockResolvedValueOnce({ id: 2, name: 'Dismantle' } as any);
        
        prismaMock.warehouseStock.findUnique.mockImplementation((args: any) => {
            if (args.where.itemId_warehouseId.warehouseId === 1) {
                return Promise.resolve({
                    id: 100, warehouseId: 1, itemId: 10,
                    stockNew: 10, stockDismantle: 0, stockDamaged: 0,
                    createdAt: new Date(), updatedAt: new Date()
                } as any);
            }
            if (args.where.itemId_warehouseId.warehouseId === 2) {
                return Promise.resolve({
                    id: 200, warehouseId: 2, itemId: 10,
                    stockNew: 0, stockDismantle: 0, stockDamaged: 0,
                    createdAt: new Date(), updatedAt: new Date()
                } as any);
            }
            return Promise.resolve(null);
        });

        prismaMock.stockOut.create.mockResolvedValue({ id: 300 } as any);
        
        const result = await createTransfer(payload);
        
        expect(result.success).toBe(true);
        
        // It should decrement from source
        expect(prismaMock.warehouseStock.update).toHaveBeenCalledWith({
            where: { id: 100 },
            data: {
                stockNew: { decrement: 5 },
                stockDismantle: { decrement: 0 },
                stockDamaged: { decrement: 0 },
                updatedAt: expect.any(Date)
            }
        });

        // It should increment to target
        expect(prismaMock.warehouseStock.update).toHaveBeenCalledWith({
            where: { id: 200 },
            data: {
                stockNew: { increment: 5 },
                stockDismantle: { increment: 0 },
                stockDamaged: { increment: 0 },
                updatedAt: expect.any(Date)
            }
        });
    });

    it('should properly handle mixed SN types for transfer', async () => {
        const payload = {
            sourceWarehouseId: 1,
            targetWarehouseId: 2,
            itemId: 10,
            qty: 2,
            serialNumbers: ['SN-NEW-1', 'SN-DISMANTLE-1']
        };

        prismaMock.itemType.upsert.mockResolvedValueOnce({ id: 1, name: 'Baru' } as any);
        prismaMock.itemType.upsert.mockResolvedValueOnce({ id: 2, name: 'Dismantle' } as any);
        
        prismaMock.warehouseStock.findUnique.mockImplementation((args: any) => {
            if (args.where.itemId_warehouseId.warehouseId === 1) {
                return Promise.resolve({
                    id: 100, warehouseId: 1, itemId: 10,
                    stockNew: 5, stockDismantle: 5, stockDamaged: 0,
                    createdAt: new Date(), updatedAt: new Date()
                } as any);
            }
            if (args.where.itemId_warehouseId.warehouseId === 2) {
                return Promise.resolve({
                    id: 200, warehouseId: 2, itemId: 10,
                    stockNew: 0, stockDismantle: 0, stockDamaged: 0,
                    createdAt: new Date(), updatedAt: new Date()
                } as any);
            }
            return Promise.resolve(null);
        });

        prismaMock.serialNumber.findUnique.mockImplementation((args: any) => {
            if (args.where.code === 'SN-NEW-1') {
                return Promise.resolve({ id: 1001, code: 'SN-NEW-1', typeId: 1, warehouseId: 1, statusId: 99 } as any);
            } else if (args.where.code === 'SN-DISMANTLE-1') {
                return Promise.resolve({ id: 1002, code: 'SN-DISMANTLE-1', typeId: 2, warehouseId: 1, statusId: 99 } as any);
            }
            return Promise.resolve(null);
        });

        prismaMock.itemStatus.findUnique.mockResolvedValue({ id: 99, name: 'In Stock' } as any);
        prismaMock.stockOut.create.mockResolvedValue({ id: 300 } as any);
        
        const result = await createTransfer(payload);
        
        expect(result.success).toBe(true);
        
        // It should decrement 1 from stockNew and 1 from stockDismantle on source
        expect(prismaMock.warehouseStock.update).toHaveBeenCalledWith({
            where: { id: 100 },
            data: {
                stockNew: { decrement: 1 },
                stockDismantle: { decrement: 1 },
                stockDamaged: { decrement: 0 },
                updatedAt: expect.any(Date)
            }
        });

        // It should increment 1 to stockNew and 1 to stockDismantle on target
        expect(prismaMock.warehouseStock.update).toHaveBeenCalledWith({
            where: { id: 200 },
            data: {
                stockNew: { increment: 1 },
                stockDismantle: { increment: 1 },
                stockDamaged: { increment: 0 },
                updatedAt: expect.any(Date)
            }
        });

        // It should update SN warehouse locations
        expect(prismaMock.serialNumber.update).toHaveBeenCalledTimes(2);
        expect(prismaMock.serialNumber.update).toHaveBeenCalledWith({
            where: { id: 1001 },
            data: { warehouseId: 2, updatedAt: expect.any(Date) }
        });
    });
});
