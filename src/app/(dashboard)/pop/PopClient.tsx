"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Edit2, Trash2, Building, MapPin, Search, Loader2, X, Tags } from "lucide-react";
import PopForm from "@/components/PopForm";
import { getPops, getWarehousesForSelect, createPop, updatePop, deletePop } from "@/app/actions/pop";
import { getAreasForSelect } from "@/app/actions/warehouse";
import { Prisma } from "@prisma/client";

type PopProps = Prisma.PopGetPayload<{
    include: {
        area: true;
        managingWarehouse: true;
        _count: {
            select: { stockOuts: true; installations: true; serialNumbers: true };
        };
    };
}>;

type ActiveFilter = { type: 'area' | 'gudang'; value: string; label: string };

export default function PopClient() {
    const [pops, setPops] = useState<PopProps[]>([]);
    const [areas, setAreas] = useState<{ id: number; name: string }[]>([]);
    const [warehouses, setWarehouses] = useState<{ id: number; name: string; type: string }[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

    const addFilter = (filter: ActiveFilter) => {
        if (!activeFilters.some(f => f.type === filter.type && f.value === filter.value)) {
            setActiveFilters(prev => [...prev, filter]);
        }
        setSearchInput("");
        setIsSuggestionsOpen(false);
    };

    const removeFilter = (filter: ActiveFilter) => {
        setActiveFilters(prev => prev.filter(f => !(f.type === filter.type && f.value === filter.value)));
    };

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPop, setEditingPop] = useState<PopProps | null>(null);

    const loadData = async () => {
        setLoading(true);
        const [popsRes, areasRes, warehousesRes] = await Promise.all([
            getPops(),
            getAreasForSelect(),
            getWarehousesForSelect()
        ]);

        if (popsRes.success && popsRes.data) {
            setPops(popsRes.data as PopProps[]);
            setError("");
        } else {
            setError(popsRes.error || "Gagal memuat data POP");
        }

        if (areasRes.success && areasRes.data) {
            setAreas(areasRes.data as any);
        }

        if (warehousesRes.success && warehousesRes.data) {
            setWarehouses(warehousesRes.data as any);
        }

        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Build suggestions
    const uniqueAreas = Array.from(new Set(pops.map(p => p.area?.name).filter(Boolean))) as string[];
    const uniqueManagingWh = Array.from(new Set(pops.map(p => p.managingWarehouse?.name).filter(Boolean))) as string[];

    const suggestions: ActiveFilter[] = searchInput.trim().length > 0 ? [
        ...uniqueAreas
            .filter(a => a.toLowerCase().includes(searchInput.toLowerCase()))
            .filter(a => !activeFilters.some(f => f.type === 'area' && f.value === a))
            .map(a => ({ type: 'area' as const, value: a, label: a })),
        ...uniqueManagingWh
            .filter(w => w.toLowerCase().includes(searchInput.toLowerCase()))
            .filter(w => !activeFilters.some(f => f.type === 'gudang' && f.value === w))
            .map(w => ({ type: 'gudang' as const, value: w, label: w }))
    ] : [];

    const activeAreaFilters = activeFilters.filter(f => f.type === 'area').map(f => f.value);
    const activeWhFilters = activeFilters.filter(f => f.type === 'gudang').map(f => f.value);

    const filteredPops = useMemo(() => {
        return pops.filter(p => {
            const matchesArea = activeAreaFilters.length === 0 || activeAreaFilters.includes(p.area?.name || '');
            const matchesWh = activeWhFilters.length === 0 || activeWhFilters.includes(p.managingWarehouse?.name || '');
            const matchesFreeText = searchInput.trim() === '' ||
                p.name.toLowerCase().includes(searchInput.toLowerCase()) ||
                (p.managingWarehouse?.name || '').toLowerCase().includes(searchInput.toLowerCase()) ||
                (p.area?.name || '').toLowerCase().includes(searchInput.toLowerCase());
            return matchesArea && matchesWh && matchesFreeText;
        });
    }, [pops, searchInput, activeFilters]);

    const handleCreate = async (formData: FormData) => {
        const res = await createPop(formData);
        if (res.success) loadData();
        return res;
    };

    const handleUpdate = async (formData: FormData, id?: number) => {
        if (!id) return { success: false, error: "ID tidak valid" };
        const res = await updatePop(id, formData);
        if (res.success) loadData();
        return res;
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus POP ini?")) {
            const res = await deletePop(id);
            if (!res.success) {
                alert(res.error);
            } else {
                loadData();
            }
        }
    };

    const openEdit = (pop: PopProps) => {
        setEditingPop(pop);
        setIsFormOpen(true);
    };

    const openCreate = () => {
        setEditingPop(null);
        setIsFormOpen(true);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin text-purple-500 w-8 h-8" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative w-full max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-20" />
                    <input
                        type="text"
                        className="w-full bg-[#020617] border border-[#1E293B] text-white rounded-lg pl-8 pr-4 py-2 text-xs placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
                        placeholder="Ketik untuk filter: area, gudang pengelola, nama POP..."
                        value={searchInput}
                        onChange={(e) => { setSearchInput(e.target.value); setIsSuggestionsOpen(true); }}
                        onFocus={() => { if (searchInput.trim().length > 0) setIsSuggestionsOpen(true); }}
                    />

                    {/* Autocomplete Suggestions */}
                    {isSuggestionsOpen && suggestions.length > 0 && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsSuggestionsOpen(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0F172A] border border-[#1E293B] rounded-xl shadow-2xl z-50 overflow-hidden">
                                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                    {suggestions.filter(s => s.type === 'area').length > 0 && (
                                        <>
                                            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-[#020617]/60 flex items-center gap-1.5">
                                                <MapPin size={10} /> Area
                                            </div>
                                            {suggestions.filter(s => s.type === 'area').map(s => (
                                                <button key={`area-${s.value}`} onClick={() => addFilter(s)} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left hover:bg-purple-500/10 transition-colors">
                                                    <MapPin size={12} className="text-pink-400 shrink-0" />
                                                    <span className="text-slate-300">{s.label}</span>
                                                    <span className="ml-auto text-[9px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">+ filter</span>
                                                </button>
                                            ))}
                                        </>
                                    )}
                                    {suggestions.filter(s => s.type === 'gudang').length > 0 && (
                                        <>
                                            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-[#020617]/60 flex items-center gap-1.5">
                                                <Building size={10} /> Gudang Pengelola
                                            </div>
                                            {suggestions.filter(s => s.type === 'gudang').map(s => (
                                                <button key={`wh-${s.value}`} onClick={() => addFilter(s)} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left hover:bg-purple-500/10 transition-colors">
                                                    <Building size={12} className="text-amber-400 shrink-0" />
                                                    <span className="text-slate-300">{s.label}</span>
                                                    <span className="ml-auto text-[9px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">+ filter</span>
                                                </button>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <button onClick={openCreate} className="btn bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-xl transition-colors font-medium">
                    <Plus size={18} /> Tambah POP
                </button>
            </div>

            {/* Active Filter Badges */}
            {activeFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Filter Aktif:</span>
                    {activeFilters.map((f, i) => (
                        <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${f.type === 'area' ? 'bg-pink-500/10 border-pink-500/20 text-pink-400' :
                                'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            }`}>
                            {f.type === 'area' ? <MapPin size={10} /> : <Building size={10} />}
                            <span className="text-[11px] font-medium">{f.label}</span>
                            <button onClick={() => removeFilter(f)} className="ml-0.5 p-0.5 rounded-full transition-colors hover:bg-white/10">
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                    <button onClick={() => setActiveFilters([])} className="text-[10px] text-slate-500 hover:text-white transition-colors underline underline-offset-2">
                        Reset Semua
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPops.length === 0 ? (
                    <div className="col-span-full p-12 text-center text-slate-500 glass rounded-xl border border-[#334155]">
                        <div className="flex flex-col items-center justify-center gap-2">
                            <Building size={32} className="opacity-20" />
                            <p>{(searchInput || activeFilters.length > 0) ? "Tidak ada POP yang cocok dengan filter" : "Belum ada data POP terdaftar"}</p>
                        </div>
                    </div>
                ) : (
                    filteredPops.map((pop) => (
                        <div key={pop.id} className="glass rounded-xl p-5 border border-[#334155] hover:border-slate-500 transition-colors flex flex-col h-full relative overflow-hidden group">

                            {/* Decorative gradient blur */}
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors" />

                            <div className="flex justify-between items-start mb-4 relative">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-lg bg-purple-500/20 text-purple-400">
                                        <Building size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white text-lg leading-tight">{pop.name}</h3>
                                        {pop.area && (
                                            <span className="flex items-center gap-1 mt-1 text-slate-400 text-xs">
                                                <MapPin size={12} /> {pop.area.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4 space-y-2 relative">
                                {pop.location && (
                                    <p className="text-sm text-slate-400 line-clamp-2">
                                        {pop.location}
                                    </p>
                                )}
                                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                                    <span className="font-medium">Gudang Pengelola:</span>
                                    <span className="text-white bg-slate-700 px-2 py-0.5 rounded ml-auto">
                                        {pop.managingWarehouse?.name || <span className="text-slate-500 italic">Belum Diatur</span>}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-[#334155] flex items-center justify-between relative">
                                <div className="flex gap-4">
                                    <div className="text-center" title="Total Perangkat SN di POP ini">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider">Devices</p>
                                        <p className="font-mono text-white mt-0.5">{pop._count.serialNumbers}</p>
                                    </div>
                                    <div className="text-center" title="Riwayat Instalasi">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider">Installs</p>
                                        <p className="font-mono text-white mt-0.5">{pop._count.installations}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openEdit(pop)}
                                        className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(pop.id)}
                                        disabled={pop._count.serialNumbers > 0 || pop._count.installations > 0 || pop._count.stockOuts > 0}
                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                        title={(pop._count.serialNumbers > 0 || pop._count.installations > 0 || pop._count.stockOuts > 0) ? "Tidak dapat dihapus: POP memiliki riwayat perangkat" : "Hapus"}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isFormOpen && (
                <PopForm
                    initialData={editingPop ? {
                        id: editingPop.id,
                        name: editingPop.name,
                        location: editingPop.location,
                        areaId: editingPop.areaId,
                        warehouseId: editingPop.warehouseId
                    } : undefined}
                    areas={areas}
                    warehouses={warehouses}
                    onClose={() => setIsFormOpen(false)}
                    onSubmit={editingPop ? handleUpdate : handleCreate}
                />
            )}
        </div>
    );
}
