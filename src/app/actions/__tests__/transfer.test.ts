import { vi, describe, it, expect, beforeEach } from 'vitest';
import { prismaMock } from '@/lib/db.mock';
import { createTransfer, createBatchTransfer } from '../transfer';

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

describe('Transfer Action: createBatchTransfer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        prismaMock.$transaction.mockImplementation(async (cb) => {
            if (typeof cb === 'function') {
                return cb(prismaMock);
            }
            return cb;
        });
    });

    it('should return error if source and target warehouses are identical', async () => {
        const payload = {
            sourceWarehouseId: 1,
            targetWarehouseId: 1,
            items: [
                { itemId: 10, qty: 5, serialNumbers: [] }
            ]
        };

        const result = await createBatchTransfer(payload);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Gudang asal dan tujuan tidak boleh sama.');
    });

    it('should return error if batch items array is empty', async () => {
        const payload = {
            sourceWarehouseId: 1,
            targetWarehouseId: 2,
            items: []
        };

        const result = await createBatchTransfer(payload);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Minimal 1 barang harus ditambahkan.');
    });

    it('should process batch transfer of mixed items (SN and Non-SN) successfully', async () => {
        const payload = {
            sourceWarehouseId: 1,
            targetWarehouseId: 2,
            description: 'Batch Test Description',
            items: [
                {
                    itemId: 10, // Non-SN Item
                    qty: 5,
                    qtyNew: 5,
                    qtyDismantle: 0,
                    qtyDamaged: 0,
                    serialNumbers: []
                },
                {
                    itemId: 11, // SN Item
                    qty: 2,
                    serialNumbers: ['SN-B-1', 'SN-B-2']
                }
            ]
        };

        prismaMock.itemType.upsert.mockResolvedValueOnce({ id: 1, name: 'Baru' } as any);
        prismaMock.itemType.upsert.mockResolvedValueOnce({ id: 2, name: 'Dismantle' } as any);

        prismaMock.warehouseStock.findUnique.mockImplementation((args: any) => {
            if (args.where.itemId_warehouseId.itemId === 10) {
                if (args.where.itemId_warehouseId.warehouseId === 1) {
                    return Promise.resolve({ id: 101, warehouseId: 1, itemId: 10, stockNew: 10, stockDismantle: 0, stockDamaged: 0 } as any);
                }
                return Promise.resolve({ id: 201, warehouseId: 2, itemId: 10, stockNew: 0, stockDismantle: 0, stockDamaged: 0 } as any);
            }
            if (args.where.itemId_warehouseId.itemId === 11) {
                if (args.where.itemId_warehouseId.warehouseId === 1) {
                    return Promise.resolve({ id: 102, warehouseId: 1, itemId: 11, stockNew: 5, stockDismantle: 0, stockDamaged: 0 } as any);
                }
                return Promise.resolve({ id: 202, warehouseId: 2, itemId: 11, stockNew: 0, stockDismantle: 0, stockDamaged: 0 } as any);
            }
            return Promise.resolve(null);
        });

        prismaMock.serialNumber.findUnique.mockImplementation((args: any) => {
            if (args.where.code === 'SN-B-1') {
                return Promise.resolve({ id: 2001, code: 'SN-B-1', typeId: 1, warehouseId: 1, itemId: 11, statusId: 99 } as any);
            }
            if (args.where.code === 'SN-B-2') {
                return Promise.resolve({ id: 2002, code: 'SN-B-2', typeId: 1, warehouseId: 1, itemId: 11, statusId: 99 } as any);
            }
            return Promise.resolve(null);
        });

        prismaMock.itemStatus.findUnique.mockResolvedValue({ id: 99, name: 'In Stock' } as any);
        prismaMock.stockOut.create.mockResolvedValue({ id: 400 } as any);

        const result = await createBatchTransfer(payload);

        expect(result.success).toBe(true);

        // Verify that stock was decremented correctly for Non-SN item (item 10)
        expect(prismaMock.warehouseStock.update).toHaveBeenCalledWith({
            where: { id: 101 },
            data: {
                stockNew: { decrement: 5 },
                stockDismantle: { decrement: 0 },
                stockDamaged: { decrement: 0 },
                updatedAt: expect.any(Date)
            }
        });

        // Verify that stock was incremented correctly for Non-SN item (item 10)
        expect(prismaMock.warehouseStock.update).toHaveBeenCalledWith({
            where: { id: 201 },
            data: {
                stockNew: { increment: 5 },
                stockDismantle: { increment: 0 },
                stockDamaged: { increment: 0 },
                updatedAt: expect.any(Date)
            }
        });

        // Verify SN updates
        expect(prismaMock.serialNumber.update).toHaveBeenCalledWith({
            where: { id: 2001 },
            data: { warehouseId: 2, updatedAt: expect.any(Date) }
        });
        expect(prismaMock.serialNumber.update).toHaveBeenCalledWith({
            where: { id: 2002 },
            data: { warehouseId: 2, updatedAt: expect.any(Date) }
        });
    });
});

