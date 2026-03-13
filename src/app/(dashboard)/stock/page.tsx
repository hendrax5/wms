import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getWarehouseList } from "@/app/actions/master";
import StockIndexClient from "./StockIndexClient";

export default async function StockIndexPage() {
    const session = await auth();
    const level = session?.user?.level;
    const warehouseId = session?.user?.warehouseId;

    // CABANG users only have 1 warehouse — go directly to it
    if (level === "CABANG" && warehouseId) {
        redirect(`/stock/warehouse/${warehouseId}`);
    }

    // MASTER/SPV/STAFF see all warehouses
    const res = await getWarehouseList();
    const warehouses = res.success && res.data ? res.data : [];

    return <StockIndexClient warehouses={warehouses} />;
}
