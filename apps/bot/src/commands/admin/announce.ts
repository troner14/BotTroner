import { ActionRowBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { CommandBuilder } from "@class/builders/CommandBuilder";
import { _U, getGuildLang } from "@src/utils/translate";

const command = new CommandBuilder();

command.setName("announce")
    .setDescription("comando que envia un anuncio al canal designado para anuncios")
    .addChannelOption(option =>
        option.setName("channel")
            .setDescription("canal donde se enviara el anuncio")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))

command.runner = async ({client, interaction}) => {
    // const guildLang = getGuildLang(interaction.guildId!, client);
    const channel = interaction.options.getChannel("channel", true);
    
    // Crear el modal para el anuncio
    const modal = new ModalBuilder()
        .setCustomId(`announce-modal_${channel.id}`)
        .setTitle('Crear Anuncio');

    const titleInput = new TextInputBuilder()
        .setCustomId('title')
        .setLabel("Título del anuncio")
        .setMaxLength(100)
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const messageInput = new TextInputBuilder()
        .setCustomId('message')
        .setLabel("Mensaje del anuncio")
        .setMinLength(10)
        .setMaxLength(2000)
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput);
    const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput);

    modal.addComponents(firstActionRow, secondActionRow);

    await interaction.showModal(modal);
}

export default command
