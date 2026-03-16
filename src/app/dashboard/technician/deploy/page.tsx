'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Search, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function ScanToDeployPage() {
    const [serialCode, setSerialCode] = useState('');
    const [scannedItem, setScannedItem] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    const [siteName, setSiteName] = useState('');
    const [isDeploying, setIsDeploying] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        if (isScannerOpen) {
            scannerRef.current = new Html5QrcodeScanner(
                "qr-reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
            );
            
            scannerRef.current.render(
                (decodedText) => {
                    setSerialCode(decodedText);
                    setIsScannerOpen(false);
                    // Automatically trigger the scan API
                    submitScanData(decodedText);
                },
                (error) => {
                    // Ignore frame errors
                }
            );
        } else {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    console.error("Failed to clear html5QrcodeScanner. ", error);
                });
            }
        }

        return () => {
             if (scannerRef.current) {
                 scannerRef.current.clear().catch(e => console.error(e));
             }
        };
    }, [isScannerOpen]);

    const submitScanData = async (codeToScan: string) => {
        setError(null);
        setScannedItem(null);
        setSuccessMessage(null);
        
        if (!codeToScan.trim()) return;

        setLoading(true);
        try {
            const res = await fetch('/api/deploy/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serialCode: codeToScan }),
            });
            const data = await res.json();
            
            if (!res.ok) {
                setError(data.error || 'Failed to scan serial number');
                return;
            }
            
            setScannedItem(data.data);
        } catch (err: any) {
            setError(err.message || 'Network error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitScanData(serialCode);
    };

    const handleDeploy = async () => {
        if (!siteName.trim()) {
            setError("Harap isi Site/Customer Name");
            return;
        }

        setIsDeploying(true);
        setError(null);
        
        try {
            const res = await fetch('/api/deploy/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    serialCode, 
                    siteName,
                    technicianId: 1 // Dummy ID pending real auth
                }),
            });
            
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Gagal mendeploy aset');
                return;
            }
            
            setSuccessMessage(`Berhasil! Aset [${scannedItem.item.name}] kini aktif di ${siteName}`);
            setScannedItem(null);
            setSerialCode('');
            setSiteName('');
        } catch (err: any) {
            setError(err.message || "Kesalahan jaringan saat deploy");
        } finally {
            setIsDeploying(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b">
                <Camera className="w-8 h-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-800">Scan & Deploy Asset</h1>
            </div>

            {/* Input Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
                <label className="block text-sm font-medium text-gray-700">Scan Serial Number (SN)</label>
                <form onSubmit={handleScan} className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setIsScannerOpen(!isScannerOpen)}
                        className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
                        title="Buka Kamera Scanner"
                    >
                        {isScannerOpen ? <X className="w-5 h-5 text-red-500" /> : <Camera className="w-5 h-5" />}
                    </button>
                    <input
                        type="text"
                        value={serialCode}
                        onChange={(e) => setSerialCode(e.target.value)}
                        placeholder="Gunakan Barcode Scanner PDA atau Ketik Manual..."
                        className="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                        autoFocus
                    />
                    <button 
                        type="submit" 
                        disabled={loading || !serialCode}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? 'Scanning...' : <><Search className="w-4 h-4"/> Cari</>}
                    </button>
                </form>
                {isScannerOpen && (
                    <div className="mt-4 border rounded-lg overflow-hidden bg-black text-white p-2">
                        <div id="qr-reader" className="w-full"></div>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3">
                    <AlertCircle className="text-red-500 w-5 h-5 mt-0.5" />
                    <div>
                        <h3 className="text-red-800 font-medium">Verifikasi Gagal</h3>
                        <p className="text-red-600 text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Success Message */}
            {successMessage && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md flex items-start space-x-3">
                    <CheckCircle2 className="text-green-500 w-5 h-5 mt-0.5" />
                    <div>
                        <h3 className="text-green-800 font-medium">Deployment Selesai</h3>
                        <p className="text-green-600 text-sm mt-1">{successMessage}</p>
                    </div>
                </div>
            )}

            {/* Validation Success & Action Section */}
            {scannedItem && (
                <div className="bg-gray-50 border rounded-lg overflow-hidden translate-y-2 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-green-600 px-4 py-3 text-white flex justify-between items-center">
                        <span className="font-medium">Item Valid & Ready to Deploy</span>
                        <span className="bg-green-700 px-2 py-1 rounded text-xs font-bold">{scannedItem.status}</span>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500">Nama Perangkat</p>
                                <p className="font-semibold text-gray-900 text-base">{scannedItem.item.name}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Tipe / Kondisi</p>
                                <p className="font-medium text-gray-900">{scannedItem.type}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Sumber Gudang</p>
                                <p className="font-medium text-gray-900">{scannedItem.warehouse.name}</p>
                            </div>
                        </div>

                        <hr />

                        <div className="space-y-4">
                            <h3 className="font-medium text-gray-900">Alokasi Aset (Assign To)</h3>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Site / Customer / Work Order ID <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={siteName}
                                    onChange={(e) => setSiteName(e.target.value)}
                                    placeholder="Contoh: Bpk. Budi - WO-2026-X81"
                                    className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <button
                                onClick={handleDeploy}
                                disabled={isDeploying || !siteName}
                                className="w-full py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                                {isDeploying ? 'Mendeploy Asset...' : 'Confirm Deployment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
