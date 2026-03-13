import DashboardClient from "./DashboardClient";
import { getDashboardStats, getLowStockAlerts, getRecentTransactions } from "@/app/actions/dashboard";

export default async function DashboardPage() {
    const [statsRes, alertsRes, trxRes] = await Promise.all([
        getDashboardStats(),
        getLowStockAlerts(),
        getRecentTransactions()
    ]);

    return (
        <div className="p-4 md:p-6">
            <DashboardClient
                initialStats={statsRes.success ? (statsRes.data as any) : null}
                initialAlerts={alertsRes.success ? (alertsRes.data as any) : []}
                initialTrx={trxRes.success ? (trxRes.data as any) : []}
            />
        </div>
    );
}
