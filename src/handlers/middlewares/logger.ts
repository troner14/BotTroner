import logger from "@src/utils/logger";
import type { HandlerContext, HandlerResult, IMiddleware } from "../core/BaseHandler";
import { InteractionType } from "discord.js";

/**
 * Middleware para logging de actividad
 */
export class ActivityLogMiddleware implements IMiddleware {
    name = "activity-log";
    priority = 999; // Último en ejecutarse
    logger = logger.child({ module: "ActivityLogMiddleware" });

    async execute(context: HandlerContext): Promise<HandlerResult | void> {
        const { interaction } = context;

        // Log básico de actividad
        let interactionType: string = "";
        if (interaction.type === InteractionType.ApplicationCommand) {
            interactionType = 'ChatInputCommand';
        } else if (interaction.type === InteractionType.MessageComponent) {
            if (interaction.isButton()) {
                interactionType = 'Button';
            } else if (interaction.isStringSelectMenu()) {
                interactionType = 'SelectMenu';
            } else {
                interactionType = 'MessageComponent';
            }
        } else if (interaction.type === InteractionType.ModalSubmit) {
            interactionType = 'ModalSubmit';
        } else if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
            interactionType = 'Autocomplete';
        }
        this.logger.debug({
            user: interaction.user.tag,
            action: 'commandName' in interaction ? interaction.commandName : 
                    'customId' in interaction ? interaction.customId : 
                    (interaction as any).type,
            guild: interaction.guildId || 'DM',
            timestamp: new Date().toISOString(),
            id: interaction.id,
            typeid: interaction.type,
            type: interactionType,
            locale: interaction.locale,
        })

        return { success: true };
    }
}

export const activityLogMiddleware = new ActivityLogMiddleware();