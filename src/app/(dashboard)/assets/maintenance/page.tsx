import { getAllMaintenanceLogs, getTechnicians, getAssets } from '@/app/actions/assets';
import MaintenanceClient from './MaintenanceClient';

export const dynamic = 'force-dynamic';

export default async function MaintenancePage() {
    const [logs, technicians, assets] = await Promise.all([
        getAllMaintenanceLogs(),
        getTechnicians(),
        getAssets(),
    ]);

    return <MaintenanceClient initialLogs={logs} technicians={technicians} assets={assets} />;
}
