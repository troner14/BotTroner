import type { HandlerContext, HandlerResult, IMiddleware } from "../core/BaseHandler";

/**
 * Middleware para ignorar interacciones de componentes
 */
export class IgnoreComponentsMiddleware implements IMiddleware {
    name = "ignore-Components";
    priority = 1;

    async execute(context: HandlerContext): Promise<HandlerResult | void> {
        const { interaction } = context;

        if (interaction.isMessageComponent()) {
            if (interaction.customId.startsWith("paginator")) {
                return { success: false };
            }
        }

        return { success: true };
    }
}

export const ignoreComponentsMiddleware = new IgnoreComponentsMiddleware();