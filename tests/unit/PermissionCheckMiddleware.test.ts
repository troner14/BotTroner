import { test, expect, describe, mock } from "bun:test";
import { PermissionCheckMiddleware } from "@src/handlers/middlewares/permission.check";
import type { HandlerContext } from "@src/handlers/core/BaseHandler";
import type { ChatInputCommandInteraction } from "discord.js";

function createMockContext(overrides: Record<string, any> = {}): HandlerContext<ChatInputCommandInteraction> {
    return {
        interaction: {
            guildId: "guild-1",
            user: { id: "user-1" },
            member: {
                roles: {
                    cache: {
                        map: mock().mockReturnValue(["role-1", "role-2"])
                    }
                }
            },
            replied: false,
            deferred: false,
            reply: mock().mockResolvedValue(undefined),
            options: {
                getSubcommand: mock().mockReturnValue("list"),
                getSubcommandGroup: mock().mockReturnValue(null),
            },
            ...overrides,
        } as unknown as ChatInputCommandInteraction,
        client: {
            permissions: {
                hasPermission: mock().mockResolvedValue(true),
            },
            ...overrides.client,
        } as any,
    };
}

describe("PermissionCheckMiddleware", () => {

    // --- Static (single permission) mode ---

    describe("static permission mode", () => {
        test("allows when user has permission", async () => {
            const middleware = new PermissionCheckMiddleware("ticket:view");
            const ctx = createMockContext();

            const result = await middleware.execute(ctx);
            expect(result?.success).toBe(true);
        });

        test("denies when user lacks permission", async () => {
            const middleware = new PermissionCheckMiddleware("ticket:view");
            const ctx = createMockContext();
            (ctx.client.permissions.hasPermission as any).mockResolvedValue(false);

            const result = await middleware.execute(ctx);
            expect(result?.success).toBe(false);
        });

        test("sends ephemeral reply when denied", async () => {
            const middleware = new PermissionCheckMiddleware("ticket:view");
            const ctx = createMockContext();
            (ctx.client.permissions.hasPermission as any).mockResolvedValue(false);

            await middleware.execute(ctx);
            expect((ctx.interaction as any).reply).toHaveBeenCalled();
        });

        test("uses custom deny message", async () => {
            const middleware = new PermissionCheckMiddleware("ticket:view", "Custom deny");
            const ctx = createMockContext();
            (ctx.client.permissions.hasPermission as any).mockResolvedValue(false);

            await middleware.execute(ctx);
            expect((ctx.interaction as any).reply).toHaveBeenCalledWith(
                expect.objectContaining({ content: "Custom deny" })
            );
        });
    });

    // --- Dynamic map mode ---

    describe("dynamic permission map mode", () => {
        test("resolves subcommand from map", async () => {
            const middleware = new PermissionCheckMiddleware({
                "list": "prox:panel:list",
                "info": "prox:panel:info",
            });
            const ctx = createMockContext();

            const result = await middleware.execute(ctx);
            expect(result?.success).toBe(true);
            expect(ctx.client.permissions.hasPermission).toHaveBeenCalledWith(
                "guild-1", "user-1", expect.any(Array), "prox:panel:list"
            );
        });

        test("resolves group:subcommand key", async () => {
            const middleware = new PermissionCheckMiddleware({
                "role:assign": "perms:role:assign",
            });
            const ctx = createMockContext({
                options: {
                    getSubcommand: mock().mockReturnValue("assign"),
                    getSubcommandGroup: mock().mockReturnValue("role"),
                },
            });

            const result = await middleware.execute(ctx);
            expect(result?.success).toBe(true);
            expect(ctx.client.permissions.hasPermission).toHaveBeenCalledWith(
                "guild-1", "user-1", expect.any(Array), "perms:role:assign"
            );
        });
    });

    // --- Deny-by-default ---

    describe("deny-by-default behavior", () => {
        test("denies unmapped subcommand when denyByDefault=true (default)", async () => {
            const middleware = new PermissionCheckMiddleware({
                "list": "prox:panel:list",
            });
            const ctx = createMockContext({
                options: {
                    getSubcommand: mock().mockReturnValue("unknown-sub"),
                    getSubcommandGroup: mock().mockReturnValue(null),
                },
            });

            const result = await middleware.execute(ctx);
            expect(result?.success).toBe(false);
        });

        test("allows unmapped subcommand when denyByDefault=false", async () => {
            const middleware = new PermissionCheckMiddleware(
                { "list": "prox:panel:list" },
                "❌ Denied",
                false // denyByDefault = false
            );
            const ctx = createMockContext({
                options: {
                    getSubcommand: mock().mockReturnValue("unknown-sub"),
                    getSubcommandGroup: mock().mockReturnValue(null),
                },
            });

            const result = await middleware.execute(ctx);
            expect(result?.success).toBe(true);
        });
    });

    // --- Edge cases ---

    describe("edge cases", () => {
        test("fails when no guild context", async () => {
            const middleware = new PermissionCheckMiddleware("ticket:view");
            const ctx = createMockContext({ guildId: null, member: null });

            const result = await middleware.execute(ctx);
            expect(result?.success).toBe(false);
        });

        test("does not reply if already replied", async () => {
            const middleware = new PermissionCheckMiddleware("ticket:view");
            const ctx = createMockContext({ replied: true });
            (ctx.client.permissions.hasPermission as any).mockResolvedValue(false);

            await middleware.execute(ctx);
            expect((ctx.interaction as any).reply).not.toHaveBeenCalled();
        });

        test("has correct name and priority", () => {
            const middleware = new PermissionCheckMiddleware("ticket:view");
            expect(middleware.name).toBe("Permission-Check");
            expect(middleware.priority).toBe(10);
        });
    });
});
