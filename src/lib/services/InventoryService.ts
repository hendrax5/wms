import { prisma } from "@/lib/db";

export class InventoryService {
    /**
     * Calculates the total physical usable stock, excluding damaged items.
     * @param stocks Array of stock objects containing stockNew and stockDismantle
     * @returns Total physical usable stock
     */
    static calculateTotalFisik(stocks: Array<{ stockNew: number; stockDismantle: number }>): number {
        return stocks.reduce((acc, curr) => acc + (curr.stockNew || 0) + (curr.stockDismantle || 0), 0);
    }

    /**
     * Aggregates warehouse stock data, optionally filtered by warehouse ID.
     * Calculates total physical stock for each item excluding damaged stock.
     * @param warehouseFilter Optional warehouse ID to filter by
     * @returns A map of item IDs to their total physical stock
     */
    static async getAggregatedStockMap(warehouseFilter?: number): Promise<Record<number, number>> {
        const stocks = await (prisma as any).warehouseStock.groupBy({
            by: ['itemId'],
            where: warehouseFilter ? { warehouseId: warehouseFilter } : undefined,
            _sum: { stockNew: true, stockDismantle: true, stockDamaged: true }
        });

        return stocks.reduce((acc: Record<number, number>, curr: any) => {
            acc[curr.itemId] = (curr._sum.stockNew || 0) + (curr._sum.stockDismantle || 0); // Exclude stockDamaged
            return acc;
        }, {} as Record<number, number>);
    }

    /**
     * Aggregates total physical stock across all items, optionally filtered by warehouse ID.
     * @param warehouseFilter Optional warehouse ID to filter by
     * @returns Total physical stock across all matching warehouse stocks
     */
    static async getTotalFisikAggregated(warehouseFilter?: number): Promise<number> {
        const stocks = await prisma.warehouseStock.findMany({
            where: warehouseFilter ? { warehouseId: warehouseFilter } : undefined,
            select: { stockNew: true, stockDismantle: true }
        });

        return this.calculateTotalFisik(stocks);
    }
}
