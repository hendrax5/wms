import { getAssets, getAssetStats } from '@/app/actions/assets';
import AssetsClient from './AssetsClient';

export const dynamic = 'force-dynamic';

export default async function AssetsPage() {
    const [assets, stats] = await Promise.all([
        getAssets(),
        getAssetStats(),
    ]);

    return <AssetsClient initialAssets={assets} stats={stats} />;
}
