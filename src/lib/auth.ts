import NextAuth, { type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            username: string;
            level: string;
            warehouseId: number | null;
            jabatan: string | null;
            accessibleWarehouseIds: number[];
        } & DefaultSession["user"];
    }

    interface User {
        id: string;
        username: string;
        level: string;
        warehouseId: number | null;
        jabatan: string | null;
    }
}

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    return null;
                }

                const { prisma } = await import("@/lib/db");

                const user = await prisma.user.findUnique({
                    where: {
                        username: credentials.username as string
                    },
                    include: {
                        userWarehouseAccesses: true
                    }
                });

                console.log("LOGIN ATTEMPT FOR:", credentials.username, "USER_FOUND:", !!user, "IS_ACTIVE:", user?.isActive);

                if (!user || !user.isActive) {
                    return null;
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                console.log("PASSWORD MATCH:", isPasswordValid);

                if (!isPasswordValid) {
                    return null;
                }

                // Extract accessible warehouse IDs for SPVs and others
                const accessibleIds = new Set<number>();
                if (user.warehouseId) accessibleIds.add(user.warehouseId);
                if (user.userWarehouseAccesses) {
                    user.userWarehouseAccesses.forEach((acc: any) => accessibleIds.add(acc.warehouseId));
                }

                return {
                    id: user.id.toString(),
                    name: user.name,
                    username: user.username,
                    level: user.level,
                    warehouseId: user.warehouseId,
                    jabatan: user.jabatan,
                    accessibleWarehouseIds: Array.from(accessibleIds)
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }: { token: any, user: any }) {
            if (user) {
                token.id = user.id;
                token.username = user.username;
                token.level = user.level;
                token.warehouseId = user.warehouseId;
                token.jabatan = user.jabatan;
                token.accessibleWarehouseIds = user.accessibleWarehouseIds;
            }
            return token;
        },
        async session({ session, token }: { session: any, token: any }) {
            if (token && session.user) {
                // Read from token (persistent, no DB fetch needed on every session check)
                session.user.id = token.id as string;
                session.user.username = token.username as string;
                session.user.level = token.level as string;
                session.user.warehouseId = token.warehouseId as number | null;
                session.user.jabatan = token.jabatan as string | null;
                session.user.accessibleWarehouseIds = token.accessibleWarehouseIds as number[] || (token.warehouseId ? [token.warehouseId] : []);
            }
            return session;
        }
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt" as const,
    },
    trustHost: true,
    useSecureCookies: false,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

// Centralized RBAC Guard Utilities
export async function requireAuth() {
    const session = await auth();
    if (!session || !session.user) {
        throw new Error("Unauthorized");
    }
    return session;
}

export function hasWarehouseAccess(session: any, targetWarehouseId: number): boolean {
    if (!session || !session.user) return false;
    
    // MASTER level has access to all warehouses
    if (session.user.level === 'MASTER') return true;
    
    // ADMIN only has access to their primary warehouseId
    if (session.user.level === 'ADMIN') return session.user.warehouseId === targetWarehouseId;
    
    // SPV and other roles check the accessible list
    return session.user.accessibleWarehouseIds?.includes(targetWarehouseId) || false;
}

// Global scope check for the active selected branch
export async function getBranchScope(): Promise<number | null> {
    const session = await auth();
    if (!session?.user) return null;
    if (session.user.level === "MASTER") return null;

    // First try to use the selected branch from cookie
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const activeBranchCookie = cookieStore.get("wms_active_branch")?.value;
    
    if (activeBranchCookie) {
        const branchId = parseInt(activeBranchCookie, 10);
        if (!isNaN(branchId)) {
            // Validate the user actually has access to the chosen branch
            if (session.user.accessibleWarehouseIds?.includes(branchId)) {
                return branchId;
            }
        }
    }

    // Default fallback: if they have multiple warehouses, default to global (null)
    if (session.user.accessibleWarehouseIds && session.user.accessibleWarehouseIds.length > 1) {
        return null;
    }

    // Otherwise fallback to their primary assigned warehouse
    return session.user.warehouseId ?? null;
}
