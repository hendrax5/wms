import { getAssetById } from '@/app/actions/assets';
import AssetDetailClient from './AssetDetailClient';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AssetDetailPage({ params }: { params: { id: string } }) {
    const asset = await getAssetById(Number(params.id));
    if (!asset) notFound();
    return <AssetDetailClient asset={asset} />;
}
