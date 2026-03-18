import { Metadata } from 'next';
import SettingsClient from './SettingsClient';
import { getAppConfig } from '@/app/actions/settings';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export const metadata: Metadata = {
    title: 'Pengaturan',
};

export default async function SettingsPage() {
    const session = await auth();
    if (!session || (session.user as any)?.level !== 'MASTER') {
        redirect('/');
    }

    const { data: config } = await getAppConfig();
    
    return <SettingsClient initialConfig={config} />;
}
