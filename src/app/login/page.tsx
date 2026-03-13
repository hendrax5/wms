"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BoxIcon, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await signIn("credentials", {
                username,
                password,
                redirect: false,
            });

            if (res?.error) {
                setError("Username atau password tidak valid. Silakan coba lagi.");
            } else {
                router.push("/");
                router.refresh();
            }
        } catch {
            setError("Terjadi kesalahan sistem. Hubungi administrator.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden" style={{ background: '#020617' }}>
            {/* Animated background orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-10"
                    style={{ background: 'radial-gradient(circle, #22C55E, transparent 70%)' }} />
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full opacity-8"
                    style={{ background: 'radial-gradient(circle, #3B82F6, transparent 70%)' }} />
                <div className="absolute top-3/4 left-1/3 w-64 h-64 rounded-full opacity-5"
                    style={{ background: 'radial-gradient(circle, #8B5CF6, transparent 70%)' }} />
                {/* Grid overlay */}
                <div className="absolute inset-0 opacity-[0.015]"
                    style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
            </div>

            <div className="w-full max-w-md animate-fade-in relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-2xl shadow-green-500/30 mb-4">
                        <BoxIcon size={26} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">WMS-2026</h1>
                    <p className="text-sm text-slate-500 mt-1">Warehouse Management System</p>
                </div>

                {/* Card */}
                <div className="glass-card p-7 shadow-2xl shadow-black/60">
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-white">Masuk ke Akun Anda</h2>
                        <p className="text-sm text-slate-500 mt-1">Gunakan kredensial yang diberikan administrator</p>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {/* Error Alert */}
                        {error && (
                            <div className="flex items-start gap-2.5 bg-red-500/8 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm animate-fade-in">
                                <span className="shrink-0 mt-0.5">⚠</span>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Username */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide" htmlFor="username">
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoComplete="username"
                                placeholder="contoh@email.com"
                                style={{ background: 'rgba(15,23,42,0.8)', borderColor: '#1E293B', fontSize: '15px' }}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide" htmlFor="password">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPwd ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••••"
                                    style={{ background: 'rgba(15,23,42,0.8)', borderColor: '#1E293B', fontSize: '15px', paddingRight: '2.75rem' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPwd(!showPwd)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn btn-primary mt-2 py-2.5 text-sm"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    Masuk ke Dashboard
                                    <ArrowRight size={15} />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-[11px] text-slate-600 mt-6 pt-5 border-t border-[#0F172A]">
                        © 2026 PT. HSP / SCT · WMS-2026 · All rights reserved
                    </p>
                </div>
            </div>
        </div>
    );
}
