import { MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { BaseHandler } from "../core/BaseHandler";
import type { ExtendedClient } from "@src/class/extendClient";


export class CategoryHandler extends BaseHandler<ChatInputCommandInteraction> {
    constructor() {
        super("TicketCategoryHandler");
    }

    async handle(context: { interaction: ChatInputCommandInteraction, client: ExtendedClient}): Promise<void> {
        const { interaction, client } = context;
        const args = interaction.options;
        const command = args.getSubcommand();

        switch (command) {
            case "new":
                const categ_name = args.getString("name", true);
                const categ_desc = args.getString("description", true);
                const categid = args.getString("categdiscid") ?? undefined;

                const newSuccess = await client.ticket.newTicketCateg(interaction.guildId!, categ_name, categ_desc, categid);
                
                interaction.reply({
                    content: `la creacion de la categoria a sido ${newSuccess ? "exitosa" : "un fracaso"}`,
                    flags: MessageFlags.Ephemeral
                })
                break;
            case "set":
                const id = args.getInteger("categid", true);
                const name = args.getString("name") ?? undefined;
                const desc = args.getString("description") ?? undefined;
                const categId = args.getString("categdiscid") ?? undefined;

                const editSuccess = await client.ticket.updateTicketCateg(id, name, desc, categId);

                interaction.reply({
                    content: `la creacion de la categoria a sido ${editSuccess ? "exitosa" : "un fracaso"}`,
                    flags: MessageFlags.Ephemeral
                })
                break;
        }

    }
}