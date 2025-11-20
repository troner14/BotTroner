import { GuildMember, MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { BaseHandler } from "../core/BaseHandler";
import type { ExtendedClient } from "@src/class/extendClient";


export class UserHandler extends BaseHandler<ChatInputCommandInteraction> {
    constructor() {
        super("TicketUserHandler");
    }

    async handle(context: { interaction: ChatInputCommandInteraction, client: ExtendedClient}): Promise<void> {
        const { interaction, client } = context;
        const args = interaction.options;
        const command = args.getSubcommand();

        switch (command) {
            case "add":
                const userToAdd = args.getMentionable("user", true) as GuildMember;
                await client.ticket.addUser(interaction, client, userToAdd);
                break;
            case "remove":
                const userToRemove = args.getMentionable("user", true) as GuildMember;
                await client.ticket.removeUser(interaction, client, userToRemove);
                break;
        }
    }
}