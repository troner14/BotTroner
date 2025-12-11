import { ChannelType, EmbedBuilder, TextChannel } from "discord.js";
import type { Buttons } from "@src/types/components";

export const data: Buttons["data"] = {
    name: 'announce-confirm'
}

export const optionalParams: Buttons["optionalParams"] = {
    hash: ""
}

export const type: Buttons["type"] = "button";

export const run: Buttons["run"] = async ({ interaction, client, optionalParams }) => {
    const hash = optionalParams?.["hash"] as string;

    // Obtener la información del anuncio desde el Map
    const announcementData = client.announcements.get(hash);

    if (!announcementData) {
        await interaction.update({
            content: "❌ Error: El anuncio ha expirado o no existe. Por favor, crea uno nuevo.",
            embeds: [],
            components: []
        });
        return;
    }

    // Verificar que el usuario que confirma es el mismo que creó el anuncio
    if (announcementData.userId !== interaction.user.id) {
        await interaction.reply({
            content: "❌ Solo el creador del anuncio puede confirmarlo.",
            ephemeral: true
        });
        return;
    }

    const { channelId, title, message, fields, imatge } = announcementData;

    try {
        const channel = await client.channels.fetch(channelId);
        
        if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) {
            await interaction.update({
                content: "❌ Error: El canal no existe o no es un canal de texto válido.",
                embeds: [],
                components: []
            });
            return;
        }

        // Crear embed del anuncio
        const announceEmbed = new EmbedBuilder()
            .setTitle(title)
            .setColor(0x5865F2)
            .setFooter({ text: `Anuncio de ${interaction.user.tag}` })
            .setTimestamp();
        if (message.trim() !== "") {
            announceEmbed.setDescription(message);
        }
        if (fields && fields.length > 0) {
            announceEmbed.addFields(fields);
        }
        if (imatge) {
            announceEmbed.setImage(imatge);
        }

        // Enviar al canal designado
        await (channel as TextChannel).send({ embeds: [announceEmbed] });

        // Limpiar del Map
        client.announcements.delete(hash);

        // Confirmar al usuario
        await interaction.update({
            content: `✅ **Anuncio enviado exitosamente** al canal <#${channelId}>`,
            embeds: [],
            components: []
        });

    } catch (error) {
        console.error("Error enviando anuncio:", error);
        await interaction.update({
            content: "❌ Hubo un error al enviar el anuncio. Verifica que tengo permisos en ese canal.",
            embeds: [],
            components: []
        });
    }
}
