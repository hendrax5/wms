import { vi, describe, it, expect, beforeEach } from 'vitest';
import { prismaMock } from '@/lib/db.mock';
import { createUser, updateUser } from '../user';

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
    unstable_noStore: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
    auth: vi.fn().mockResolvedValue({
        user: { id: 1, name: 'Admin', level: 'MASTER' }
    }),
}));

vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('hashed_password'),
    }
}));

describe('User Action: createUser', () => {
    it('should return error if username already exists', async () => {
        const formData = new FormData();
        formData.append('name', 'Budi');
        formData.append('username', 'budi');
        formData.append('password', 'secret');

        prismaMock.user.findUnique.mockResolvedValue({ id: 1, username: 'budi' } as any);

        const result = await createUser(formData);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Username sudah digunakan');
    });

    it('should successfully create a new user with access to multiple warehouses', async () => {
        const formData = new FormData();
        formData.append('name', 'Budi');
        formData.append('username', 'budi');
        formData.append('password', 'secret');
        formData.append('warehouseIds', '1,2');

        prismaMock.user.findUnique.mockResolvedValue(null);
        prismaMock.user.create.mockResolvedValue({ id: 2 } as any);

        const result = await createUser(formData);
        
        expect(result.success).toBe(true);
        expect(prismaMock.user.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    username: 'budi',
                    password: 'hashed_password',
                    warehouseId: 1, // First ID fallback
                    userWarehouseAccesses: {
                        create: [{ warehouseId: 1 }, { warehouseId: 2 }]
                    }
                })
            })
        );
    });
});

describe('User Action: updateUser', () => {
    beforeEach(() => {
        prismaMock.$transaction.mockImplementation(async (cb) => {
            if (typeof cb === 'function') {
                return cb(prismaMock);
            }
            return cb;
        });
    });

    it('should successfully update user and replace warehouse access', async () => {
        const formData = new FormData();
        formData.append('name', 'Budi Update');
        formData.append('username', 'budi');
        formData.append('warehouseIds', '3'); // Changed to 3

        prismaMock.user.findUnique.mockResolvedValue(null);
        
        const result = await updateUser(2, formData);
        
        expect(result.success).toBe(true);
        expect(prismaMock.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 2 },
                data: expect.objectContaining({
                    name: 'Budi Update',
                    warehouseId: 3,
                })
            })
        );
        expect(prismaMock.userWarehouseAccess.deleteMany).toHaveBeenCalledWith({
            where: { userId: 2 }
        });
        expect(prismaMock.userWarehouseAccess.createMany).toHaveBeenCalledWith({
            data: [{ userId: 2, warehouseId: 3 }]
        });
    });
});
