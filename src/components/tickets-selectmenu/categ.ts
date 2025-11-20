import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import type { selMenuType } from "@dTypes/components";

export const data: selMenuType["data"] = {
    name: "categ-ticket"
}

export const type: selMenuType["type"] = "selectmenu";

export const run: selMenuType["run"] = async ({ interaction, client }) => {
    const ticketType = interaction.values[0]
    const modal = new ModalBuilder()
        .setCustomId(`ticket-modal_${ticketType}`)
        .setTitle('Sistema de tickets');


    const langInput = new TextInputBuilder()
        .setCustomId('lang')
        .setLabel("idioma que hablas ?| lang to speak?")
        .setMaxLength(10)
        .setStyle(TextInputStyle.Short);

    const descInput = new TextInputBuilder()
        .setCustomId('description')
        .setLabel("descripcion del motivo del ticket?")
        .setMinLength(20)
        .setStyle(TextInputStyle.Paragraph);


    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(langInput);
    const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(descInput);


    modal.addComponents(firstActionRow, secondActionRow);

    await interaction.showModal(modal)
}