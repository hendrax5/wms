import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';
import { prisma } from './db';
import { vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
    __esModule: true,
    default: mockDeep<PrismaClient>(),
    prisma: mockDeep<PrismaClient>(),
}));

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
    mockReset(prismaMock);
});
