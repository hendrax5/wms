import Link from "next/link";
import { Package, Tags, Building2, Users, ArrowRight, Server } from "lucide-react";
import { auth } from "@/lib/auth";

export default async function MasterDataHub() {
    const session = await auth();
    const userLevel = session?.user?.level || "STAFF";
    const isMasterOrSPV = ["MASTER", "SPV"].includes(userLevel);

    const menus = [
        {
            title: "Data Kategori",
            description: "Kelola kategori perangkat seperti Router, Switch, SFP, dll.",
            icon: Tags,
            href: "/master/categories",
            color: "blue",
            accent: "from-blue-500/20",
            roles: null // visible to all
        },
        {
            title: "Data Barang",
            description: "Kelola master item, harga, dan batasan stok minimum.",
            icon: Package,
            href: "/master/items",
            color: "green",
            accent: "from-green-500/20",
            roles: null // visible to all
        },
        {
            title: "Direktori Gudang",
            description: "Kelola lokasi fisik penyimpanan stok barang.",
            icon: Building2,
            href: "/stock",
            color: "amber",
            accent: "from-amber-500/20",
            roles: null
        },
        {
            title: "Data POP",
            description: "Kelola daftar Point of Presence dan lokasinya.",
            icon: Server,
            href: "/pop",
            color: "pink",
            accent: "from-pink-500/20",
            roles: null
        },
        {
            title: "Data Pengguna",
            description: "Kelola hak akses dan peran pengguna.",
            icon: Users,
            href: "/master/users",
            color: "purple",
            accent: "from-purple-500/20",
            roles: ["MASTER"] // ONLY MASTER can see this
        }
    ].filter(m => m.roles === null || m.roles.includes(userLevel));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Master Data</h2>
                    <p className="text-sm text-slate-400">Pusat pengelolaan data inti Warehouse Management System.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mt-6">
                {menus.map((menu, i) => (
                    <Link href={menu.href} key={i} className="stat-card group relative overflow-hidden cursor-pointer p-6">
                        {/* Gradient top glow */}
                        <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${menu.accent} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

                        <div className="flex items-start justify-between relative z-10 w-full">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl bg-${menu.color}-500/10 flex items-center justify-center shrink-0`}>
                                    <menu.icon size={24} className={`text-${menu.color}-400`} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors">{menu.title}</h3>
                                    <p className="text-sm text-slate-400 mt-1">{menu.description}</p>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-amber-400 group-hover:text-[#020617] transition-all">
                                <ArrowRight size={16} />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
