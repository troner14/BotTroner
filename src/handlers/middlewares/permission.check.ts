import type { HandlerContext, HandlerResult, IMiddleware } from "@handlers/core/BaseHandler";
import type { AllPerms } from "@src/types/permsTypes";
import type { ChatInputCommandInteraction } from "discord.js";

/**
 * Middleware de permisos per als handlers.
 *
 * Dues modalitats:
 *  - Estàtic: un sol permís per a tot el handler
 *  - Dinàmic: Record<subcommand, permís> — mapa per subcommand
 *
 * Resolució de clau dinàmica: "group:subcommand" → "subcommand" → "group"
 * Si no troba mapping → permet (subcommands sense permís requerit)
 */
export class PermissionCheckMiddleware implements IMiddleware {
    name = "Permission-Check";
    priority = 10;

    private readonly permission: AllPerms | null;
    private readonly permissionMap: Map<string, AllPerms> | null;
    private readonly denyMessage: string;

    constructor(
        config: AllPerms | Record<string, AllPerms>,
        denyMessage: string = "❌ No tens permisos per executar aquesta acció."
    ) {
        if (typeof config === "string") {
            this.permission = config;
            this.permissionMap = null;
        } else {
            this.permission = null;
            this.permissionMap = new Map(Object.entries(config));
        }
        this.denyMessage = denyMessage;
    }

    async execute(context: HandlerContext): Promise<HandlerResult | void> {
        const { interaction, client } = context;

        if (!interaction.guildId || !interaction.member) {
            return { success: false, error: new Error("No guild context for permission check") };
        }

        let requiredPerm: AllPerms | undefined;

        if (this.permission) {
            requiredPerm = this.permission;
        } else if (this.permissionMap && "options" in interaction) {
            const chatInteraction = interaction as ChatInputCommandInteraction;
            const subcommand = chatInteraction.options.getSubcommand(false);
            const group = chatInteraction.options.getSubcommandGroup(false);

            const keys = [
                group && subcommand ? `${group}:${subcommand}` : null,
                subcommand,
                group
            ].filter(Boolean) as string[];

            for (const key of keys) {
                if (this.permissionMap.has(key)) {
                    requiredPerm = this.permissionMap.get(key);
                    break;
                }
            }

            if (!requiredPerm) return { success: true };
        }

        if (!requiredPerm) return { success: true };

        const member = interaction.member;
        const roleIds = "cache" in member.roles
            ? (member.roles as any).cache.map((r: any) => r.id)
            : (member.roles as string[]);

        const allowed = await client.permissions.hasPermission(
            interaction.guildId,
            interaction.user.id,
            roleIds,
            requiredPerm
        );

        if (!allowed) {
            try {
                if ("reply" in interaction && !interaction.replied && !interaction.deferred) {
                    await (interaction as any).reply({
                        content: this.denyMessage,
                        flags: 64 // Ephemeral
                    });
                }
            } catch {
                // Ignore reply errors
            }
            return { success: false, error: new Error(`Missing permission: ${requiredPerm}`) };
        }

        return { success: true };
    }
}
