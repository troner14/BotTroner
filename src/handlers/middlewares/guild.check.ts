import type { HandlerContext, HandlerResult, IMiddleware } from "../core/BaseHandler";

/**
 * Middleware para checkear que la interacción proviene de un guild
 */
export class GuildCheckMiddleware implements IMiddleware {
    name = "Guild-Check";
    priority = 1;

    async execute(context: HandlerContext): Promise<HandlerResult | void> {
        const { interaction } = context;

        if (interaction.guildId === null) {
            return { success: false, error: new Error("No guild context") };
        }

        return { success: true };
    }
}

export const guildCheckMiddleware = new GuildCheckMiddleware();