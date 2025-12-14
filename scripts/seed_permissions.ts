
import { prisma } from "../src/class/prismaClient";

async function main() {
    const userId = "495874245516066816"; // User from logs
    const vmId = "100";
    const roleId = "0"; // Default/No role

    console.log(`Granting permissions for User ${userId} on VM ${vmId}...`);

    try {
        await prisma.vm_permissions.create({
            data: {
                vmId: vmId,
                userId: userId,
                roleId: roleId,
                permissions: ["*"], // Grant ALL permissions
                grantedBy: "System_Seed"
            }
        });
        console.log("✅ Permission granted successfully!");
    } catch (e) {
        console.error("❌ Error granting permission:", e);
    }
}

main();
