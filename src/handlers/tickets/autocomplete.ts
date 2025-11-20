import { type AutocompleteInteraction} from "discord.js";
import { BaseHandler } from "../core/BaseHandler";
import type { ExtendedClient } from "@src/class/extendClient";


export class AutocompleteHandler extends BaseHandler<AutocompleteInteraction> {
    constructor() {
        super("TicketAutocompleteHandler");
    }

    async handle(context: { interaction: AutocompleteInteraction, client: ExtendedClient}): Promise<void> {
        const { interaction, client } = context;
        const args = interaction.options;
        const {name, value} = args.getFocused(true);

        switch (name) {
            case "categid":
            case "category":
                const categories = await client.prisma.tickets_categories.findMany({
                    where: {
                        guildId: interaction.guild!.id,
                    }
                });
                const categValues = categories.map((categ) => ({
                    name: categ.name,
                    value: categ.id
                })).filter(categ => categ.name.includes(value));
                await interaction.respond(categValues.slice(0, 25));
                break;
            case "categdiscid":
                const guildCategories = interaction.guild?.channels.cache.filter(channel => channel.type == 4);
                const guildCategValues = guildCategories?.map((categ) => ({
                    name: categ.name,
                    value: categ.id
                })).filter(categ => categ.name.includes(value)) || [];
                await interaction.respond(guildCategValues.slice(0, 25));
                break;
        }
    }
}