import { ChatInputCommandInteraction, CommandInteractionOptionResolver } from "discord.js";
import { BaseHandler, type HandlerContext } from "@handlers/core/BaseHandler";

export class CommandHandler extends BaseHandler<ChatInputCommandInteraction> {
    constructor() {
        super("CommandHandler");
    }

    async handle(context: HandlerContext<ChatInputCommandInteraction>): Promise<void> {
        const { interaction, client } = context;
        const { commands } = client;
        const { commandName } = interaction;
        const command = commands?.get(commandName);
        if (!command) {
            throw new Error(`Command ${commandName} not found`);
        }
        await command.runner({
            interaction,
            client,
            args: (interaction as any).options as CommandInteractionOptionResolver
        });
    }
}