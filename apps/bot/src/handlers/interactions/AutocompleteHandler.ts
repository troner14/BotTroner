import { AutocompleteInteraction, CommandInteractionOptionResolver } from "discord.js";
import { BaseHandler, type HandlerContext } from "@handlers/core/BaseHandler";

export class AutocompleteHandler extends BaseHandler<AutocompleteInteraction> {
    constructor() {
        super("AutocompleteHandler");
    }

    async handle(context: HandlerContext<AutocompleteInteraction>): Promise<void> {
        const { interaction, client } = context;
        const { commandName } = interaction;
        const command = client.commands?.get(commandName);
        if (!command) return;
        try {
            await command.autocomplete({
                interaction,
                client,
                args: interaction.options as CommandInteractionOptionResolver
            });
        } catch (err) {
            this.logger.error(err);
        }
    }
}