import DashboardLayoutClient from "./DashboardLayoutClient";
import { getAppConfig } from "@/app/actions/settings";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: config } = await getAppConfig();
    return <DashboardLayoutClient appConfig={config}>{children}</DashboardLayoutClient>;
}
