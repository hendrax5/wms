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

                return {
                    id: user.id.toString(),
                    name: user.name,
                    username: user.username,
                    level: user.level,
                    warehouseId: user.warehouseId,
                    jabatan: user.jabatan,
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
            }
            return token;
        },
        async session({ session, token }: { session: any, token: any }) {
            if (token && session.user) {
                // Always re-fetch from DB to get the latest warehouseId and level
                try {
                    const { prisma } = await import("@/lib/db");
                    const freshUser = await prisma.user.findUnique({
                        where: { id: Number(token.id) },
                        select: { id: true, username: true, level: true, warehouseId: true, jabatan: true, isActive: true }
                    });
                    if (freshUser && freshUser.isActive) {
                        session.user.id = freshUser.id.toString();
                        session.user.username = freshUser.username;
                        session.user.level = freshUser.level;
                        session.user.warehouseId = freshUser.warehouseId;
                        session.user.jabatan = freshUser.jabatan;
                    }
                } catch {
                    // Fallback to token data if DB fetch fails
                    session.user.id = token.id as string;
                    session.user.username = token.username as string;
                    session.user.level = token.level as string;
                    session.user.warehouseId = token.warehouseId as number | null;
                    session.user.jabatan = token.jabatan as string | null;
                }
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
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
