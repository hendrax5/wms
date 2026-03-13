import UsersClient from "./UsersClient";
import { getUsers } from "@/app/actions/user";
import { getWarehousesForSelect } from "@/app/actions/pop";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function UsersPage() {
    // Only MASTER can access user management
    const session = await auth();
    if (!session?.user || session.user.level !== "MASTER") {
        redirect("/master");
    }

    const [usersRes, warehousesRes] = await Promise.all([
        getUsers(),
        getWarehousesForSelect()
    ]);

    return <UsersClient
        initialUsers={usersRes.success && usersRes.data ? usersRes.data : []}
        warehouses={warehousesRes.success && warehousesRes.data ? warehousesRes.data : []}
    />;
}
