import { test, expect, describe, beforeEach, mock } from "bun:test";
import { PermissionService } from "@src/class/permissions/PermissionService";

// --- Mock Prisma ---

function createMockPrisma() {
    return {
        perfils: {
            findMany: mock().mockResolvedValue([]),
            findFirst: mock().mockResolvedValue(null),
            create: mock().mockResolvedValue({ id: 1, name: "TestRole", guildId: "guild-1", roleId: "role-1" }),
        },
        perfil_permisos: {
            upsert: mock().mockResolvedValue({}),
            deleteMany: mock().mockResolvedValue({ count: 1 }),
        },
        user_permissions: {
            findMany: mock().mockResolvedValue([]),
            upsert: mock().mockResolvedValue({}),
            deleteMany: mock().mockResolvedValue({ count: 1 }),
        },
        permisos: {
            findFirst: mock().mockResolvedValue({ id: 1, name: "test:perm" }),
            findMany: mock().mockResolvedValue([]),
        },
        vm_permissions: {
            findMany: mock().mockResolvedValue([]),
            create: mock().mockResolvedValue({}),
            deleteMany: mock().mockResolvedValue({ count: 1 }),
        },
    } as any;
}

describe("PermissionService", () => {
    let service: PermissionService;
    let mockPrisma: ReturnType<typeof createMockPrisma>;

    beforeEach(() => {
        mockPrisma = createMockPrisma();
        service = new PermissionService(mockPrisma);
    });

    // --- matchesPermission (tested indirectly via hasPermission) ---

    describe("wildcard permission matching", () => {
        test("exact match grants access", async () => {
            mockPrisma.perfils.findMany.mockResolvedValue([]);
            mockPrisma.user_permissions.findMany.mockResolvedValue([
                { userId: "user-1", permisos: { name: "ticket:close" } }
            ]);

            const result = await service.hasPermission("guild-1", "user-1", [], "ticket:close");
            expect(result).toBe(true);
        });

        test("wildcard '*' grants access to any permission", async () => {
            mockPrisma.user_permissions.findMany.mockResolvedValue([
                { userId: "user-1", permisos: { name: "*" } }
            ]);

            const result = await service.hasPermission("guild-1", "user-1", [], "prox:panel:list");
            expect(result).toBe(true);
        });

        test("prefix wildcard 'prox' grants access to 'prox:panel:list'", async () => {
            mockPrisma.user_permissions.findMany.mockResolvedValue([
                { userId: "user-1", permisos: { name: "prox" } }
            ]);

            const result = await service.hasPermission("guild-1", "user-1", [], "prox:panel:list");
            expect(result).toBe(true);
        });

        test("prefix wildcard 'ticket' grants access to 'ticket:close'", async () => {
            mockPrisma.user_permissions.findMany.mockResolvedValue([
                { userId: "user-1", permisos: { name: "ticket" } }
            ]);

            const result = await service.hasPermission("guild-1", "user-1", [], "ticket:close");
            expect(result).toBe(true);
        });

        test("non-matching permission denies access", async () => {
            mockPrisma.user_permissions.findMany.mockResolvedValue([
                { userId: "user-1", permisos: { name: "ticket:close" } }
            ]);

            const result = await service.hasPermission("guild-1", "user-1", [], "prox:panel:list");
            expect(result).toBe(false);
        });

        test("no permissions denies access", async () => {
            const result = await service.hasPermission("guild-1", "user-1", [], "ticket:close");
            expect(result).toBe(false);
        });
    });

    // --- Role-level permissions ---

    describe("role-level permissions", () => {
        test("grants access via role permission", async () => {
            mockPrisma.perfils.findMany.mockResolvedValue([
                {
                    roleId: "role-1",
                    perfil_permisos: [{ permisos: { name: "ticket:view" } }]
                }
            ]);

            const result = await service.hasPermission("guild-1", "user-1", ["role-1"], "ticket:view");
            expect(result).toBe(true);
        });

        test("denies access when user has different role", async () => {
            mockPrisma.perfils.findMany.mockResolvedValue([
                {
                    roleId: "role-1",
                    perfil_permisos: [{ permisos: { name: "ticket:view" } }]
                }
            ]);

            const result = await service.hasPermission("guild-1", "user-1", ["role-2"], "ticket:view");
            expect(result).toBe(false);
        });
    });

    // --- Cache ---

    describe("cache behavior", () => {
        test("uses cached data on second call", async () => {
            mockPrisma.perfils.findMany.mockResolvedValue([]);
            mockPrisma.user_permissions.findMany.mockResolvedValue([
                { userId: "user-1", permisos: { name: "ticket:close" } }
            ]);

            await service.hasPermission("guild-1", "user-1", [], "ticket:close");
            await service.hasPermission("guild-1", "user-1", [], "ticket:close");

            // Should only query DB once due to cache
            expect(mockPrisma.perfils.findMany).toHaveBeenCalledTimes(1);
            expect(mockPrisma.user_permissions.findMany).toHaveBeenCalledTimes(1);
        });

        test("invalidateCache forces re-fetch", async () => {
            mockPrisma.perfils.findMany.mockResolvedValue([]);
            mockPrisma.user_permissions.findMany.mockResolvedValue([]);

            await service.hasPermission("guild-1", "user-1", [], "ticket:close");
            service.invalidateCache("guild-1");
            await service.hasPermission("guild-1", "user-1", [], "ticket:close");

            expect(mockPrisma.perfils.findMany).toHaveBeenCalledTimes(2);
        });

        test("invalidateAllCache clears all cached guilds", async () => {
            mockPrisma.perfils.findMany.mockResolvedValue([]);
            mockPrisma.user_permissions.findMany.mockResolvedValue([]);

            await service.hasPermission("guild-1", "user-1", [], "ticket:close");
            await service.hasPermission("guild-2", "user-1", [], "ticket:close");
            service.invalidateAllCache();
            await service.hasPermission("guild-1", "user-1", [], "ticket:close");
            await service.hasPermission("guild-2", "user-1", [], "ticket:close");

            expect(mockPrisma.perfils.findMany).toHaveBeenCalledTimes(4);
        });
    });

    // --- grantUserPermission ---

    describe("grantUserPermission", () => {
        test("grants permission and invalidates cache", async () => {
            mockPrisma.permisos.findFirst.mockResolvedValue({ id: 10, name: "ticket:close" });
            mockPrisma.user_permissions.upsert.mockResolvedValue({});

            // Pre-fill cache
            await service.hasPermission("guild-1", "user-1", [], "ticket:close");

            await service.grantUserPermission("guild-1", "target-user", "ticket:close", "granter-1");

            expect(mockPrisma.user_permissions.upsert).toHaveBeenCalledTimes(1);
        });

        test("throws when permission not found", async () => {
            mockPrisma.permisos.findFirst.mockResolvedValue(null);

            expect(
                service.grantUserPermission("guild-1", "user-1", "nonexistent" as any, "granter-1")
            ).rejects.toThrow("Permission 'nonexistent' not found");
        });
    });

    // --- revokeUserPermission ---

    describe("revokeUserPermission", () => {
        test("revokes permission and invalidates cache", async () => {
            mockPrisma.permisos.findFirst.mockResolvedValue({ id: 10, name: "ticket:close" });

            await service.revokeUserPermission("guild-1", "user-1", "ticket:close");

            expect(mockPrisma.user_permissions.deleteMany).toHaveBeenCalledTimes(1);
        });

        test("throws when permission not found", async () => {
            mockPrisma.permisos.findFirst.mockResolvedValue(null);

            expect(
                service.revokeUserPermission("guild-1", "user-1", "nonexistent" as any)
            ).rejects.toThrow("Permission 'nonexistent' not found");
        });
    });

    // --- VM permissions ---

    describe("hasVMPermission", () => {
        test("grants access when user has VM permission", async () => {
            mockPrisma.vm_permissions.findMany.mockResolvedValue([
                { userId: "user-1", roleId: null, vmId: "vm-100", permissions: ["start", "stop"], expiresAt: null }
            ]);

            const result = await service.hasVMPermission("user-1", [], "vm-100", "start");
            expect(result).toBe(true);
        });

        test("grants access with wildcard VM permission", async () => {
            mockPrisma.vm_permissions.findMany.mockResolvedValue([
                { userId: "user-1", roleId: null, vmId: "vm-100", permissions: ["*"], expiresAt: null }
            ]);

            const result = await service.hasVMPermission("user-1", [], "vm-100", "restart");
            expect(result).toBe(true);
        });

        test("denies access when VM permission expired", async () => {
            mockPrisma.vm_permissions.findMany.mockResolvedValue([
                { userId: "user-1", roleId: null, vmId: "vm-100", permissions: ["start"], expiresAt: new Date(Date.now() - 10000) }
            ]);

            const result = await service.hasVMPermission("user-1", [], "vm-100", "start");
            expect(result).toBe(false);
        });

        test("denies access when action not in permissions", async () => {
            mockPrisma.vm_permissions.findMany.mockResolvedValue([
                { userId: "user-1", roleId: null, vmId: "vm-100", permissions: ["start"], expiresAt: null }
            ]);

            const result = await service.hasVMPermission("user-1", [], "vm-100", "restart");
            expect(result).toBe(false);
        });
    });

    describe("getVMPermissionsForUser", () => {
        test("returns all granted permissions", async () => {
            mockPrisma.vm_permissions.findMany.mockResolvedValue([
                { userId: "user-1", permissions: ["start", "stop"], expiresAt: null }
            ]);

            const perms = await service.getVMPermissionsForUser("user-1", [], "vm-100");
            expect(perms).toContain("start");
            expect(perms).toContain("stop");
            expect(perms).toHaveLength(2);
        });

        test("expands wildcard to all VM permissions", async () => {
            mockPrisma.vm_permissions.findMany.mockResolvedValue([
                { userId: "user-1", permissions: ["*"], expiresAt: null }
            ]);

            const perms = await service.getVMPermissionsForUser("user-1", [], "vm-100");
            expect(perms).toContain("start");
            expect(perms).toContain("stop");
            expect(perms).toContain("restart");
            expect(perms).toContain("resetpass");
            expect(perms).toContain("subusers");
        });

        test("filters out expired permissions", async () => {
            mockPrisma.vm_permissions.findMany.mockResolvedValue([
                { userId: "user-1", permissions: ["start"], expiresAt: new Date(Date.now() - 10000) },
                { userId: "user-1", permissions: ["stop"], expiresAt: null }
            ]);

            const perms = await service.getVMPermissionsForUser("user-1", [], "vm-100");
            expect(perms).toEqual(["stop"]);
        });
    });

    describe("getInheritedSubuserPermissions", () => {
        test("returns permissions without 'subusers'", async () => {
            mockPrisma.vm_permissions.findMany.mockResolvedValue([
                { userId: "user-1", permissions: ["start", "stop", "subusers"], expiresAt: null }
            ]);

            const perms = await service.getInheritedSubuserPermissions("user-1", [], "vm-100");
            expect(perms).toContain("start");
            expect(perms).toContain("stop");
            expect(perms).not.toContain("subusers");
        });
    });

    // --- setVMUserPermissions ---

    describe("setVMUserPermissions", () => {
        test("replaces existing permissions in transaction", async () => {
            const txMock = {
                vm_permissions: {
                    deleteMany: mock().mockResolvedValue({ count: 1 }),
                    create: mock().mockResolvedValue({}),
                }
            };
            mockPrisma.$transaction = mock().mockImplementation(async (fn: any) => fn(txMock));

            await service.setVMUserPermissions("vm-100", "user-1", ["start", "stop"], "granter-1");

            expect(txMock.vm_permissions.deleteMany).toHaveBeenCalled();
            expect(txMock.vm_permissions.create).toHaveBeenCalled();
        });

        test("skips create when permissions array is empty", async () => {
            const txMock = {
                vm_permissions: {
                    deleteMany: mock().mockResolvedValue({ count: 1 }),
                    create: mock().mockResolvedValue({}),
                }
            };
            mockPrisma.$transaction = mock().mockImplementation(async (fn: any) => fn(txMock));

            await service.setVMUserPermissions("vm-100", "user-1", [], "granter-1");

            expect(txMock.vm_permissions.deleteMany).toHaveBeenCalled();
            expect(txMock.vm_permissions.create).not.toHaveBeenCalled();
        });
    });

    // --- listAllPerms ---

    describe("listAllPerms", () => {
        test("returns all permissions with descriptions", async () => {
            mockPrisma.permisos.findMany.mockResolvedValue([
                { name: "ticket:close", Descripcion: "Close a ticket" },
                { name: "prox:panel:list", Descripcion: null },
            ]);

            const perms = await service.listAllPerms();
            expect(perms).toHaveLength(2);
            expect(perms[0]).toEqual({ name: "ticket:close", description: "Close a ticket" });
            expect(perms[1]).toEqual({ name: "prox:panel:list", description: null });
        });
    });

    // --- assignRolePermission / revokeRolePermission ---

    describe("assignRolePermission", () => {
        test("creates profile if not exists, then assigns perm", async () => {
            mockPrisma.permisos.findFirst.mockResolvedValue({ id: 5, name: "ticket:view" });
            mockPrisma.perfils.findFirst.mockResolvedValue(null);
            mockPrisma.perfils.create.mockResolvedValue({ id: 1, name: "Admin", guildId: "guild-1", roleId: "role-1" });

            await service.assignRolePermission("guild-1", "role-1", "Admin", "ticket:view");

            expect(mockPrisma.perfils.create).toHaveBeenCalled();
            expect(mockPrisma.perfil_permisos.upsert).toHaveBeenCalled();
        });

        test("uses existing profile when one exists", async () => {
            mockPrisma.permisos.findFirst.mockResolvedValue({ id: 5, name: "ticket:view" });
            mockPrisma.perfils.findFirst.mockResolvedValue({ id: 1, name: "Admin", guildId: "guild-1", roleId: "role-1" });

            await service.assignRolePermission("guild-1", "role-1", "Admin", "ticket:view");

            expect(mockPrisma.perfils.create).not.toHaveBeenCalled();
            expect(mockPrisma.perfil_permisos.upsert).toHaveBeenCalled();
        });
    });

    describe("revokeRolePermission", () => {
        test("revokes permission from role", async () => {
            mockPrisma.permisos.findFirst.mockResolvedValue({ id: 5, name: "ticket:view" });
            mockPrisma.perfils.findFirst.mockResolvedValue({ id: 1, name: "Admin", guildId: "guild-1", roleId: "role-1" });

            await service.revokeRolePermission("guild-1", "role-1", "ticket:view");

            expect(mockPrisma.perfil_permisos.deleteMany).toHaveBeenCalled();
        });

        test("throws when no profile found for role", async () => {
            mockPrisma.permisos.findFirst.mockResolvedValue({ id: 5, name: "ticket:view" });
            mockPrisma.perfils.findFirst.mockResolvedValue(null);

            expect(
                service.revokeRolePermission("guild-1", "role-1", "ticket:view")
            ).rejects.toThrow("No profile found for role in this guild");
        });
    });
});
