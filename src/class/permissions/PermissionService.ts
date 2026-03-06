import type { PrismaClient } from "@prismaClient/client";
import type { AllPerms } from "@src/types/permsTypes";
import logger from "@src/utils/logger";

interface CacheEntry {
    rolePerms: Map<string, Set<string>>; // roleId -> Set<permName>
    userPerms: Map<string, Set<string>>; // userId -> Set<permName>
    timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minuts

/**
 * Servei centralitzat de permisos.
 * Combina:
 *  - perfils (role → permisos) — sistema existent
 *  - user_permissions (user → permisos) — nou
 *  - vm_permissions (user/role → VM-specific perms) — existent
 *
 * Wildcards: 'prox' cobreix 'prox:panel:list', 'prox:machine:action', etc.
 * Resolució: user override > role perms > vm-specific perms
 */
export class PermissionService {
    private readonly log = logger.child({ module: "PermissionService" });
    private cache = new Map<string, CacheEntry>();
    private readonly prisma: PrismaClient;
    private readonly vmPermissionCatalog = ["start", "stop", "restart", "resetpass", "subusers"] as const;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    /**
     * Comprova si un permís concedit cobreix un permís requerit (amb wildcards).
     * 'prox' → cobreix 'prox:panel:list'
     * '*' → cobreix tot
     */
    private matchesPermission(granted: string, required: string): boolean {
        if (granted === "*") return true;
        if (granted === required) return true;
        if (required.startsWith(granted + ":")) return true;
        return false;
    }

    private hasMatchingPerm(grantedPerms: Set<string>, required: string): boolean {
        for (const perm of grantedPerms) {
            if (this.matchesPermission(perm, required)) return true;
        }
        return false;
    }

    /**
     * Carrega i cacheja els permisos d'un guild (roles + users).
     */
    private async loadGuildPerms(guildId: string): Promise<CacheEntry> {
        const cached = this.cache.get(guildId);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached;
        }

        const rolePermsData = await this.prisma.perfils.findMany({
            where: { guildId },
            select: {
                roleId: true,
                perfil_permisos: {
                    select: {
                        permisos: { select: { name: true } }
                    }
                }
            }
        });

        const rolePerms = new Map<string, Set<string>>();
        for (const perfil of rolePermsData) {
            const perms = new Set<string>();
            for (const pp of perfil.perfil_permisos) {
                perms.add(pp.permisos.name);
            }
            const existing = rolePerms.get(perfil.roleId);
            if (existing) {
                for (const p of perms) existing.add(p);
            } else {
                rolePerms.set(perfil.roleId, perms);
            }
        }

        const userPermsData = await this.prisma.user_permissions.findMany({
            where: {
                guildId,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            },
            select: {
                userId: true,
                permisos: { select: { name: true } }
            }
        });

        const userPerms = new Map<string, Set<string>>();
        for (const up of userPermsData) {
            const existing = userPerms.get(up.userId) ?? new Set<string>();
            existing.add(up.permisos.name);
            userPerms.set(up.userId, existing);
        }

        const entry: CacheEntry = { rolePerms, userPerms, timestamp: Date.now() };
        this.cache.set(guildId, entry);
        return entry;
    }

    /**
     * Comprova si un usuari té un permís genèric.
     * Ordre: user_permissions → perfils (roles)
     */
    async hasPermission(
        guildId: string,
        userId: string,
        userRoleIds: string[],
        permission: AllPerms
    ): Promise<boolean> {
        try {
            const { rolePerms, userPerms } = await this.loadGuildPerms(guildId);

            // 1. User-level
            const userPermSet = userPerms.get(userId);
            if (userPermSet && this.hasMatchingPerm(userPermSet, permission)) {
                return true;
            }

            // 2. Role-level
            for (const roleId of userRoleIds) {
                const rolePermSet = rolePerms.get(roleId);
                if (rolePermSet && this.hasMatchingPerm(rolePermSet, permission)) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            this.log.error({ error, guildId, userId, permission }, "Error checking permission");
            return false;
        }
    }

    /**
     * Comprova permisos per a una VM específica (vm_permissions).
     */
    async hasVMPermission(
        userId: string,
        userRoleIds: string[],
        vmId: string,
        action: string
    ): Promise<boolean> {
        try {
            const vmPerms = await this.prisma.vm_permissions.findMany({
                where: {
                    vmId,
                    OR: [
                        { userId },
                        { roleId: { in: userRoleIds } }
                    ]
                }
            });

            const now = new Date();
            for (const vp of vmPerms) {
                if (vp.expiresAt && vp.expiresAt < now) continue;
                const permissions = vp.permissions as string[];
                if (permissions.includes("*") || permissions.includes(action)) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            this.log.error({ error, userId, vmId, action }, "Error checking VM permission");
            return false;
        }
    }

    async getVMPermissionsForUser(
        userId: string,
        userRoleIds: string[],
        vmId: string
    ): Promise<string[]> {
        try {
            const vmPerms = await this.prisma.vm_permissions.findMany({
                where: {
                    vmId,
                    OR: [
                        { userId },
                        { roleId: { in: userRoleIds } }
                    ]
                }
            });

            const now = new Date();
            const permissions = new Set<string>();

            for (const vp of vmPerms) {
                if (vp.expiresAt && vp.expiresAt < now) continue;
                const granted = vp.permissions as string[];
                if (!Array.isArray(granted)) continue;

                if (granted.includes("*")) {
                    for (const p of this.vmPermissionCatalog) permissions.add(p);
                    continue;
                }

                for (const p of granted) permissions.add(p);
            }

            return Array.from(permissions);
        } catch (error) {
            this.log.error({ error, userId, vmId }, "Error getting VM permissions for user");
            return [];
        }
    }

    async getInheritedSubuserPermissions(
        userId: string,
        userRoleIds: string[],
        vmId: string
    ): Promise<string[]> {
        const managerPerms = await this.getVMPermissionsForUser(userId, userRoleIds, vmId);
        return managerPerms.filter((permission) => permission !== "subusers");
    }

    /**
     * Concedeix un permís directe a un usuari.
     */
    async grantUserPermission(
        guildId: string,
        targetUserId: string,
        permission: AllPerms,
        grantedBy: string,
        expiresAt?: Date
    ): Promise<void> {
        const perm = await this.prisma.permisos.findFirst({
            where: { name: permission }
        });
        if (!perm) throw new Error(`Permission '${permission}' not found`);

        await this.prisma.user_permissions.upsert({
            where: {
                guildId_userId_permId: { guildId, userId: targetUserId, permId: perm.id }
            },
            create: {
                guildId, userId: targetUserId, permId: perm.id,
                grantedBy, expiresAt: expiresAt ?? null
            },
            update: {
                grantedBy, expiresAt: expiresAt ?? null, grantedAt: new Date()
            }
        });

        this.invalidateCache(guildId);
        this.log.info({ guildId, targetUserId, permission, grantedBy }, "User permission granted");
    }

    /**
     * Revoca un permís directe d'un usuari.
     */
    async revokeUserPermission(
        guildId: string,
        targetUserId: string,
        permission: AllPerms
    ): Promise<void> {
        const perm = await this.prisma.permisos.findFirst({
            where: { name: permission }
        });
        if (!perm) throw new Error(`Permission '${permission}' not found`);

        await this.prisma.user_permissions.deleteMany({
            where: { guildId, userId: targetUserId, permId: perm.id }
        });

        this.invalidateCache(guildId);
        this.log.info({ guildId, targetUserId, permission }, "User permission revoked");
    }

    /**
     * Assigna un permís a un perfil (role).
     */
    async assignRolePermission(
        guildId: string,
        roleId: string,
        profileName: string,
        permission: AllPerms,
    ): Promise<void> {
        const perm = await this.prisma.permisos.findFirst({
            where: { name: permission }
        });
        if (!perm) throw new Error(`Permission '${permission}' not found`);

        // Trobar o crear perfil
        let perfil = await this.prisma.perfils.findFirst({
            where: { guildId, roleId }
        });

        if (!perfil) {
            perfil = await this.prisma.perfils.create({
                data: { name: profileName, guildId, roleId }
            });
        }

        // Crear relació (ignora si ja existeix)
        await this.prisma.perfil_permisos.upsert({
            where: {
                perfilId_permId: { perfilId: perfil.id, permId: perm.id }
            },
            create: { perfilId: perfil.id, permId: perm.id },
            update: {}
        });

        this.invalidateCache(guildId);
        this.log.info({ guildId, roleId, permission }, "Role permission assigned");
    }

    /**
     * Revoca un permís d'un perfil (role).
     */
    async revokeRolePermission(
        guildId: string,
        roleId: string,
        permission: AllPerms
    ): Promise<void> {
        const perm = await this.prisma.permisos.findFirst({
            where: { name: permission }
        });
        if (!perm) throw new Error(`Permission '${permission}' not found`);

        const perfil = await this.prisma.perfils.findFirst({
            where: { guildId, roleId }
        });
        if (!perfil) throw new Error(`No profile found for role in this guild`);

        await this.prisma.perfil_permisos.deleteMany({
            where: { perfilId: perfil.id, permId: perm.id }
        });

        this.invalidateCache(guildId);
        this.log.info({ guildId, roleId, permission }, "Role permission revoked");
    }

    /**
     * Concedeix permisos específics per a una VM.
     */
    async grantVMPermission(
        vmId: string,
        userId: string | null,
        roleId: string | null,
        permissions: string[],
        grantedBy: string,
        expiresAt?: Date
    ): Promise<void> {
        if (!userId && !roleId) {
            throw new Error("Either userId or roleId must be provided");
        }

        await this.prisma.vm_permissions.create({
            data: {
                vmId, userId, roleId, permissions,
                grantedBy, expiresAt: expiresAt ?? null
            }
        });

        this.log.info({ vmId, userId, roleId, permissions, grantedBy }, "VM permission granted");
    }

    /**
     * Estableix (sobreescriu) permisos específics de VM per a un usuari.
     */
    async setVMUserPermissions(
        vmId: string,
        userId: string,
        permissions: string[],
        grantedBy: string,
        expiresAt?: Date
    ): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await tx.vm_permissions.deleteMany({
                where: { vmId, userId }
            });

            if (permissions.length === 0) return;

            await tx.vm_permissions.create({
                data: {
                    vmId,
                    userId,
                    roleId: null,
                    permissions,
                    grantedBy,
                    expiresAt: expiresAt ?? null
                }
            });
        });

        this.log.info({ vmId, userId, permissions, grantedBy }, "VM user permissions updated");
    }

    /**
     * Llista els permisos d'un usuari (directes + roles).
     */
    async getUserPermissions(
        guildId: string,
        userId: string,
        userRoleIds: string[]
    ): Promise<{ source: "user" | "role"; roleId?: string; permission: string }[]> {
        const { rolePerms, userPerms } = await this.loadGuildPerms(guildId);
        const result: { source: "user" | "role"; roleId?: string; permission: string }[] = [];

        const userPermSet = userPerms.get(userId);
        if (userPermSet) {
            for (const perm of userPermSet) {
                result.push({ source: "user", permission: perm });
            }
        }

        for (const roleId of userRoleIds) {
            const rolePermSet = rolePerms.get(roleId);
            if (rolePermSet) {
                for (const perm of rolePermSet) {
                    result.push({ source: "role", roleId, permission: perm });
                }
            }
        }

        return result;
    }

    /**
     * Llista els permisos d'un rol específic.
     */
    async getRolePermissions(guildId: string, roleId: string): Promise<string[]> {
        const { rolePerms } = await this.loadGuildPerms(guildId);
        const perms = rolePerms.get(roleId);
        return perms ? Array.from(perms) : [];
    }

    /**
     * Llista tots els permisos disponibles.
     */
    async listAllPerms(): Promise<{ name: string; description: string | null }[]> {
        const perms = await this.prisma.permisos.findMany({
            select: { name: true, Descripcion: true },
            orderBy: { name: "asc" }
        });
        return perms.map(p => ({ name: p.name, description: p.Descripcion }));
    }

    invalidateCache(guildId: string): void {
        this.cache.delete(guildId);
    }

    invalidateAllCache(): void {
        this.cache.clear();
    }
}
