"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, X } from "lucide-react";

type Option = {
    value: string;
    label: string;
    subLabel?: string;
};

type SearchableSelectProps = {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    accentColor?: string; // e.g. "blue", "rose", "amber"
    icon?: React.ReactNode;
};

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Pilih...",
    required = false,
    accentColor = "blue",
    icon,
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find((o) => o.value === value);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Auto-focus input when dropdown opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const filtered = search.trim().length === 0
        ? options
        : options.filter(
              (o) =>
                  o.label.toLowerCase().includes(search.toLowerCase()) ||
                  (o.subLabel && o.subLabel.toLowerCase().includes(search.toLowerCase()))
          );

    const handleSelect = (opt: Option) => {
        onChange(opt.value);
        setIsOpen(false);
        setSearch("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (filtered.length > 0) {
                handleSelect(filtered[0]);
            }
        }
        if (e.key === "Escape") {
            setIsOpen(false);
            setSearch("");
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
        setSearch("");
    };

    const ringColor = `focus-within:ring-${accentColor}-500 focus-within:border-${accentColor}-500`;

    // Use inline styles for dynamic accent colors to avoid Tailwind purge issues
    const accentStyles: Record<string, { ring: string; border: string; hoverBg: string; selectedBg: string }> = {
        blue: { ring: "rgba(59,130,246,0.3)", border: "rgba(59,130,246,0.5)", hoverBg: "rgba(59,130,246,0.08)", selectedBg: "rgba(59,130,246,0.15)" },
        rose: { ring: "rgba(244,63,94,0.3)", border: "rgba(244,63,94,0.5)", hoverBg: "rgba(244,63,94,0.08)", selectedBg: "rgba(244,63,94,0.15)" },
        amber: { ring: "rgba(245,158,11,0.3)", border: "rgba(245,158,11,0.5)", hoverBg: "rgba(245,158,11,0.08)", selectedBg: "rgba(245,158,11,0.15)" },
    };
    const accent = accentStyles[accentColor] || accentStyles.blue;

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Hidden native select for form validation */}
            {required && (
                <select
                    tabIndex={-1}
                    value={value}
                    required
                    onChange={() => {}}
                    className="absolute opacity-0 w-0 h-0 pointer-events-none"
                >
                    <option value=""></option>
                    {options.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            )}

            {/* Trigger / Display */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-2.5 text-left flex items-center gap-2 transition-all hover:border-slate-500"
                style={isOpen ? { borderColor: accent.border, boxShadow: `0 0 0 1px ${accent.ring}` } : {}}
            >
                {icon && <span className="shrink-0 text-slate-400">{icon}</span>}
                <span className={`flex-1 truncate ${selectedOption ? "text-white" : "text-slate-500"}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                {value && (
                    <span
                        onClick={handleClear}
                        className="shrink-0 p-0.5 rounded hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                    >
                        <X size={14} />
                    </span>
                )}
                <ChevronDown size={14} className={`shrink-0 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className="absolute left-0 right-0 top-full mt-1.5 bg-[#0F172A] border border-[#1E293B] rounded-xl shadow-2xl z-50 overflow-hidden"
                    style={{ borderColor: accent.border }}
                >
                    {/* Search Input */}
                    <div className="p-2 border-b border-[#1E293B]">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ketik untuk mencari..."
                                className="w-full bg-[#020617] border border-[#1E293B] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-all"
                                style={{ borderColor: accent.ring }}
                            />
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-56 overflow-y-auto custom-scrollbar">
                        {filtered.length === 0 ? (
                            <div className="px-4 py-6 text-center text-xs text-slate-500">
                                Tidak ditemukan hasil untuk &quot;{search}&quot;
                            </div>
                        ) : (
                            filtered.slice(0, 50).map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleSelect(opt)}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left transition-colors"
                                    style={{
                                        backgroundColor: opt.value === value ? accent.selectedBg : undefined,
                                    }}
                                    onMouseEnter={(e) => {
                                        if (opt.value !== value) e.currentTarget.style.backgroundColor = accent.hoverBg;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = opt.value === value ? accent.selectedBg : "";
                                    }}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className={`truncate ${opt.value === value ? "text-white font-semibold" : "text-slate-300"}`}>
                                            {opt.label}
                                        </p>
                                        {opt.subLabel && (
                                            <p className="text-[10px] text-slate-500 truncate mt-0.5">{opt.subLabel}</p>
                                        )}
                                    </div>
                                    {opt.value === value && (
                                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                            style={{ color: accent.border, backgroundColor: accent.ring }}>
                                            Dipilih
                                        </span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>

                    {/* Footer count */}
                    {filtered.length > 50 && (
                        <div className="px-4 py-2 border-t border-[#1E293B] text-[10px] text-slate-500 text-center">
                            Menampilkan 50 dari {filtered.length} hasil. Ketik lebih spesifik untuk mempersempit.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
