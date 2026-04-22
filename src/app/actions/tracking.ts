"use server";

import { prisma } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";

export async function getSerialNumberHistory(serialCode: string) {
    noStore();
    try {
        if (!serialCode) return { success: false, error: "Serial Code dibutuhkan" };

        const sn = await prisma.serialNumber.findUnique({
            where: { code: serialCode },
            include: {
                item: {
                    include: { category: true }
                },
                itemtype: true,
                itemstatus: true,
                warehouse: true,
                pop: true,
                stockinserial: {
                    include: {
                        stockin: {
                            include: { warehouse: true }
                        }
                    }
                },
                stockoutserial: {
                    include: {
                        stockout: {
                            include: { 
                                warehouse_stockout_warehouseIdTowarehouse: true, 
                                warehouse_stockout_targetWarehouseIdTowarehouse: true,
                                pop: true
                            }
                        }
                    }
                },
                popinstallation: {
                    include: { pop: true }
                },
                customerinstallation: true,
                damagedserial: {
                    include: {
                        damageditem: {
                            include: { warehouse: true }
                        }
                    }
                }
            }
        });

        if (!sn) {
            return { success: false, error: "Serial Number tidak ditemukan" };
        }

        const timeline: any[] = [];

        // 1. Stock Ins
        sn.stockinserial.forEach((inLog: any) => {
            timeline.push({
                date: inLog.stockin.createdAt,
                type: "INBOUND",
                title: "Barang Masuk",
                location: inLog.stockin.warehouse?.name || "Unknown",
                description: inLog.stockin.description || "Penerimaan barang baru",
                user: "System/Admin"
            });
        });

        // 2. Stock Outs (Transfers primarily, as installs are tracked separately via sn.popinstallation)
        sn.stockoutserial.forEach((outLog: any) => {
            const out = outLog.stockout;
            if (out.outType === "TRANSFER") {
                timeline.push({
                    date: out.createdAt,
                    type: "TRANSFER",
                    title: "Transfer Antar Gudang",
                    location: out.warehouse_stockout_warehouseIdTowarehouse?.name || "Unknown",
                    target: out.warehouse_stockout_targetWarehouseIdTowarehouse?.name || "Unknown",
                    description: out.description || `Dikirim via ${out.techName1 || 'Teknisi'}`,
                    user: out.techName1 || "System"
                });
            } else if (out.outType === "POP_INSTALL") {
                timeline.push({
                    date: out.createdAt,
                    type: "POP_INSTALL",
                    title: "Dikeluarkan untuk Instalasi POP",
                    location: out.warehouse_stockout_warehouseIdTowarehouse?.name || "Unknown",
                    target: out.pop?.name || out.location || "Unknown POP",
                    description: out.description || `Dibawa oleh teknisi ${out.techName1 || '-'}`,
                    user: out.techName1 || "System"
                });
            } else if (out.outType === "CUSTOMER_INSTALL") {
                timeline.push({
                    date: out.createdAt,
                    type: "CUSTOMER_INSTALL",
                    title: "Dikeluarkan untuk Instalasi Customer",
                    location: out.warehouse_stockout_warehouseIdTowarehouse?.name || "Unknown",
                    target: out.customerName || out.location || "Unknown Customer",
                    description: out.description || `Dibawa oleh teknisi ${out.techName1 || '-'}`,
                    user: out.techName1 || "System"
                });
            } else {
                timeline.push({
                    date: out.createdAt,
                    type: out.outType,
                    title: "Barang Keluar",
                    location: out.warehouse_stockout_warehouseIdTowarehouse?.name || "Unknown",
                    description: out.description || "-",
                    user: out.techName1 || "System"
                });
            }
        });

        // POP and Customer installations push their own detailed completion logs
        // 3. POP Installations
        sn.popinstallation.forEach((install: any) => {
            timeline.push({
                date: install.installedAt,
                type: "POP_INSTALL",
                title: "Penyelesaian Instalasi POP",
                location: install.pop?.name || "Unknown POP",
                target: "-",
                description: `Pemasangan selesai. Keterangan: ${install.description || '-'}`,
                user: install.installedBy || "System/Admin"
            });
        });

        // 4. Customer Installations
        sn.customerinstallation.forEach((install: any) => {
            timeline.push({
                date: install.installedAt,
                type: "CUSTOMER_INSTALL",
                title: "Penyelesaian Instalasi Customer",
                location: install.customerName || "Unknown Customer",
                target: "-",
                description: `Alamat: ${install.customerAddress || '-'}. Keterangan: ${install.description || '-'}`,
                user: install.installedBy || "System/Admin"
            });
        });

        // 5. Damaged Logs
        sn.damagedserial.forEach((dmgLog: any) => {
            timeline.push({
                date: dmgLog.damageditem.createdAt,
                type: "DAMAGED",
                title: "Laporan Kerusakan",
                location: dmgLog.damageditem.warehouse?.name || "Unknown",
                description: dmgLog.damageditem.description || "Dilaporkan rusak",
                user: "System/Admin"
            });
        });

        timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
            success: true,
            data: {
                details: {
                    code: sn.code,
                    itemName: sn.item?.name || "Unknown",
                    itemCode: sn.item?.code || "Unknown",
                    category: sn.item?.category?.name || "Unknown",
                    status: sn.itemstatus?.name || "Unknown",
                    type: sn.itemtype?.name || "Baru",
                    currentLocation: sn.warehouse?.name || sn.pop?.name || "Customer / Lainnya",
                    purchasePrice: sn.price
                },
                timeline
            }
        };

    } catch (error) {
        console.error("Tracking error:", error);
        return { success: false, error: "Gagal mengambil riwayat Serial Number" };
    }
}
