import { ActionRowBuilder, MessageFlags, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import type { Buttons } from "@src/types/components";
import { _U, getGuildLang } from "@utils/translate";

export const data: Buttons["data"] = {
    name: 'ticket-new'
}

export const type: Buttons["type"] = "button";

export const run: Buttons["run"] = async ({ interaction, client }) => {
    const discLang = await getGuildLang(interaction.guild!.id, client);
    const ticketType = new StringSelectMenuBuilder()
        .setCustomId("categ-ticket")
        .setPlaceholder("Elije el tipo de ticket")

    const categories = await client.prisma.tickets_categories.findMany({
        where: { guildId: interaction.guild!.id }
    });

    categories.forEach((categ) => {
        const tmpoption = new StringSelectMenuOptionBuilder()
            .setLabel(categ.name)
            .setDescription(categ.description)
            .setValue(categ.id.toString());
        ticketType.addOptions(tmpoption);
    })

    await interaction.reply({
        content: await _U(discLang, "ticketNewSelect"),
        components: [
            new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(ticketType)
        ],
        flags: MessageFlags.Ephemeral
    })
}
