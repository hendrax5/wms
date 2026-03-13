import { prisma } from './src/lib/db';
import bcrypt from 'bcryptjs';

async function test() {
    const u = await prisma.user.findUnique({ where: { username: 'hendra@servicex.id' } });
    console.log('Found user:', u?.username, '| Active:', u?.isActive);
    if (!u) { console.log('USER NOT FOUND'); process.exit(1); }
    const ok = await bcrypt.compare('!Tahun2026', u.password);
    console.log('Password match:', ok);
    console.log('Hash in DB:', u.password);
    await prisma.$disconnect();
}

test().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
