import { getAssetById } from '@/app/actions/assets';
import AssetDetailClient from './AssetDetailClient';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const asset = await getAssetById(Number(id));
    if (!asset) notFound();
    return <AssetDetailClient asset={asset} />;
}
