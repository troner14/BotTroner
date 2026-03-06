import { prisma } from "../../src/class/prismaClient";

const ALL_PERMISSIONS = [
    // Proxmox - wildcards
    { name: "prox", desc: "Wildcard: tota virtualització" },
    // Proxmox - panel
    { name: "prox:panel:list", desc: "Llistar panells" },
    { name: "prox:panel:info", desc: "Info d'un panell" },
    { name: "prox:panel:new", desc: "Crear panell" },
    { name: "prox:panel:delete", desc: "Eliminar panell" },
    { name: "prox:panel:setupstatus", desc: "Configurar status de panell" },
    // Proxmox - machine
    { name: "prox:machine:list", desc: "Llistar VMs" },
    { name: "prox:machine:status", desc: "Veure estat d'una VM" },
    { name: "prox:machine:action", desc: "Executar accions en VMs" },
    // Proxmox - monitor
    { name: "prox:monitor:start", desc: "Iniciar monitorització" },
    { name: "prox:monitor:stop", desc: "Aturar monitorització" },
    { name: "prox:monitor:subusers", desc: "Gestionar subusuaris de VM" },
    // Tickets - wildcard
    { name: "ticket", desc: "Wildcard: tots tickets" },
    { name: "ticket:new", desc: "Crear ticket" },
    { name: "ticket:close", desc: "Tancar ticket" },
    { name: "ticket:setup", desc: "Configurar sistema tickets" },
    { name: "ticket:view", desc: "Veure tickets" },
    { name: "ticket:adduser", desc: "Afegir usuari a ticket" },
    { name: "ticket:remuser", desc: "Treure usuari de ticket" },
    { name: "ticket:config:transcript", desc: "Configurar transcripcions" },
    { name: "ticket:config:opinions", desc: "Configurar opinions" },
    { name: "ticket:category:new", desc: "Crear categoria" },
    { name: "ticket:category:set", desc: "Modificar categoria" },
    // Channel
    { name: "channel", desc: "Wildcard: canals" },
    { name: "channel:block", desc: "Bloquejar canal" },
    { name: "channel:unblock", desc: "Desbloquejar canal" },
    // Perms management
    { name: "perms", desc: "Wildcard: gestió permisos" },
    { name: "perms:role:assign", desc: "Assignar permís a rol" },
    { name: "perms:role:revoke", desc: "Revocar permís de rol" },
    { name: "perms:user:grant", desc: "Concedir permís a usuari" },
    { name: "perms:user:revoke", desc: "Revocar permís d'usuari" },
    { name: "perms:list", desc: "Llistar permisos" },
];

async function main() {
    console.log("🔄 Seeding permissions...");

    const dedupedPermissions = Array.from(
        new Map(ALL_PERMISSIONS.map((perm) => [perm.name, perm])).values()
    );

    const existing = await prisma.permisos.findMany({
        where: {
            name: {
                in: dedupedPermissions.map((perm) => perm.name)
            }
        },
        select: {
            name: true,
            Descripcion: true
        }
    });

    const existingByName = new Map<string, string | null>(
        existing.map((perm: { name: string; Descripcion: string | null }) => [perm.name, perm.Descripcion])
    );

    const toCreate = dedupedPermissions.filter((perm) => !existingByName.has(perm.name));
    const toUpdate = dedupedPermissions.filter((perm) => existingByName.get(perm.name) !== perm.desc);

    const operations = [];

    if (toCreate.length > 0) {
        operations.push(
            prisma.permisos.createMany({
                data: toCreate.map((perm) => ({
                    name: perm.name,
                    Descripcion: perm.desc
                }))
            })
        );
    }

    for (const perm of toUpdate) {
        operations.push(
            prisma.permisos.updateMany({
                where: { name: perm.name },
                data: { Descripcion: perm.desc }
            })
        );
    }

    if (operations.length > 0) {
        await prisma.$transaction(operations);
    }

    const unchangedCount = dedupedPermissions.length - toCreate.length - toUpdate.length;
    console.log(`✅ Done. Total: ${dedupedPermissions.length} | Created: ${toCreate.length} | Updated: ${toUpdate.length} | Unchanged: ${unchangedCount}`);
}

main()
    .catch((error) => {
        console.error("❌ Error seeding permissions:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
