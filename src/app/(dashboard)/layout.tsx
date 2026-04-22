import DashboardLayoutClient from "./DashboardLayoutClient";
import { getAppConfig } from "@/app/actions/settings";
import { getAccessibleWarehouses } from "@/app/actions/user";
import { getBranchScope } from "@/lib/auth";
export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: config } = await getAppConfig();
    const { data: accessibleWarehouses } = await getAccessibleWarehouses();
    const activeWarehouseId = await getBranchScope();
    
    return (
        <DashboardLayoutClient 
            appConfig={config} 
            accessibleWarehouses={accessibleWarehouses || []}
            activeWarehouseId={activeWarehouseId}
        >
            {children}
        </DashboardLayoutClient>
    );
}
