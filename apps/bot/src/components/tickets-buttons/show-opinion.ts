import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import type { Buttons } from "@bot/shared-types/bot/components";

export const data: Buttons["data"] = {
    name: 'ticket-show-opinion'
}

export const type: Buttons["type"] = "button";

export const optionalParams: Buttons["optionalParams"] = {
    guildId: ""
}

export const run: Buttons["run"] = async ({ interaction, optionalParams }) => {
    const guildId = optionalParams?.guildId as string;
    const modal = new ModalBuilder()
        .setCustomId(`ticket-suggest-modal_${guildId}`)
        .setTitle('Sistema de tickets (opinion)');

    const opinionInput = new TextInputBuilder()
        .setCustomId('opinion')
        .setLabel("opinion de la resolucion del ticket")
        .setMaxLength(255)
        .setStyle(TextInputStyle.Short);


    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(opinionInput);

    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
}