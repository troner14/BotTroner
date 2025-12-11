import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from "discord.js";
import type { modalsType } from "@dTypes/components";
import { randomBytes } from "crypto";

export const data: modalsType["data"] = {
    name: "announce-modal",
}

export const optionalParams: modalsType["optionalParams"] = {
    channelId: ""
}

export const type: modalsType["type"] = "modals";

export const run: modalsType["run"] = async ({ interaction, client, optionalParams }) => {
    const fields = interaction.fields;
    const title = fields.getTextInputValue("title");
    const message = fields.getTextInputValue("message");
    const channelId = optionalParams?.["channelId"] as string;

    // Generar hash único para este anuncio
    const hash = randomBytes(8).toString("hex");

    // Guardar la información del anuncio en el cliente
    client.announcements.set(hash, {
        channelId,
        title,
        message,
        userId: interaction.user.id
    });

    // Limpiar el anuncio después de 5 minutos si no se confirma
    setTimeout(() => {
        client.announcements.delete(hash);
    }, 5 * 60 * 1000);

    // Crear embed de vista previa
    const previewEmbed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(message)
        .setColor(0x5865F2)
        .setFooter({ text: `Anuncio de ${interaction.user.tag}` })
        .setTimestamp();

    // Botones de confirmación
    const confirmButton = new ButtonBuilder()
        .setCustomId(`announce-confirm_${hash}`)
        .setLabel("✅ Confirmar y Enviar")
        .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
        .setCustomId(`announce-cancel_${hash}`)
        .setLabel("❌ Cancelar")
        .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(confirmButton, cancelButton);

    await interaction.reply({
        content: "📢 **Vista previa del anuncio:**\nRevisa el mensaje y confirma si deseas enviarlo al canal.",
        embeds: [previewEmbed],
        components: [buttonRow],
        flags: MessageFlags.Ephemeral
    });
}
