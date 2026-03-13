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
                type: true,
                status: true,
                warehouse: true,
                pop: true,
                stockInLogs: {
                    include: {
                        stockIn: {
                            include: { warehouse: true }
                        }
                    }
                },
                stockOutLogs: {
                    include: {
                        stockOut: {
                            include: { warehouse: true, targetWarehouse: true }
                        }
                    }
                },
                popInstalls: {
                    include: { pop: true }
                },
                custInstalls: true,
                damagedLogs: {
                    include: {
                        damagedItem: {
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
        sn.stockInLogs.forEach((inLog: any) => {
            timeline.push({
                date: inLog.stockIn.createdAt,
                type: "INBOUND",
                title: "Barang Masuk",
                location: inLog.stockIn.warehouse?.name || "Unknown",
                description: inLog.stockIn.description || "Penerimaan barang baru",
                user: "System/Admin"
            });
        });

        // 2. Stock Outs (Transfers primarily, as installs are tracked separately via sn.popInstalls)
        sn.stockOutLogs.forEach((outLog: any) => {
            if (outLog.stockOut.outType === "TRANSFER") {
                timeline.push({
                    date: outLog.stockOut.createdAt,
                    type: "TRANSFER",
                    title: "Transfer Antar Gudang",
                    location: outLog.stockOut.warehouse?.name || "Unknown",
                    target: outLog.stockOut.targetWarehouse?.name || "Unknown",
                    description: outLog.stockOut.description || "Transfer Stok",
                    user: "System/Admin"
                });
            } else {
                timeline.push({
                    date: outLog.stockOut.createdAt,
                    type: outLog.stockOut.outType,
                    title: "Barang Keluar (" + outLog.stockOut.outType + ")",
                    location: outLog.stockOut.warehouse?.name || "Unknown",
                    description: outLog.stockOut.description || "",
                    user: "System/Admin"
                });
            }
        });

        // 3. POP Installations
        sn.popInstalls.forEach((install: any) => {
            timeline.push({
                date: install.installedAt,
                type: "POP_INSTALL",
                title: "Instalasi POP",
                location: "Warehouse", // Could map where it came from if we wanted
                target: install.pop?.name || "Unknown",
                description: `Pemasangan di POP. Teknisi: ${install.installedBy || '-'}. ${install.description || ''}`,
                user: "System/Admin"
            });
        });

        // 4. Customer Installations
        sn.custInstalls.forEach((install: any) => {
            timeline.push({
                date: install.installedAt,
                type: "CUSTOMER_INSTALL",
                title: "Instalasi Customer",
                location: "Warehouse",
                target: install.customerName,
                description: `Pemasangan di Customer (${install.customerAddress || '-'}). Teknisi: ${install.installedBy || '-'}. ${install.description || ''}`,
                user: "System/Admin"
            });
        });

        // 5. Damaged Logs
        sn.damagedLogs.forEach((dmgLog: any) => {
            timeline.push({
                date: dmgLog.damagedItem.createdAt,
                type: "DAMAGED",
                title: "Laporan Kerusakan",
                location: dmgLog.damagedItem.warehouse?.name || "Unknown",
                description: dmgLog.damagedItem.description || "Dilaporkan rusak",
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
                    status: sn.status?.name || "Unknown",
                    type: sn.type?.name || "Baru",
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
