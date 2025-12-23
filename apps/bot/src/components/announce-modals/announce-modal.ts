import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, type APIEmbedField, type RestOrArray } from "discord.js";
import type { modalsType } from "@bot/shared-types/bot/components";
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
        .setColor(0x5865F2)
        .setFooter({ text: `Anuncio de ${interaction.user.tag}` })
        .setTimestamp();

    const embedFields: RestOrArray<APIEmbedField> = [];
    let newMessage = "";
    let tmpTitle = "";
    let tmpContent = "";
    let startaddContent = false;
    if (message.includes("#")) {
        const lines = message.split("\n");
        for (const line of lines) {
            if (line.startsWith("#")) {
                if (startaddContent && tmpContent.trim() !== "") {
                    embedFields.push({
                        name: tmpTitle,
                        value: tmpContent.trim(),
                        inline: false
                    });
                }
                const title = line.slice(1).trim();
                tmpTitle = title;
                tmpContent = "";
                startaddContent = true;
            } else if (startaddContent) {
                tmpContent += line + "\n";
            } else {
                newMessage += line + "\n";
            }
        }
        if (startaddContent && tmpContent.trim() !== "") {
            embedFields.push({
                name: tmpTitle,
                value: tmpContent.trim(),
                inline: false
            });
            startaddContent = false;
            tmpContent = "";
            tmpTitle = "";
        }
    }

    client.announcements.get(hash)!.fields = embedFields;

    if (message.includes("[image]")) {
        const imageRegex = /\[image\](https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp))/i;
        const match = message.match(imageRegex);
        if (match && match[1]) {
            const imageUrl = match[1];
            newMessage = newMessage.replace(match[0], "").trim();
            previewEmbed.setImage(imageUrl);
            client.announcements.get(hash)!.imatge = imageUrl;
        }
    }

    client.announcements.get(hash)!.message = newMessage;

    if (newMessage.trim() !== "") {
        previewEmbed.setDescription(newMessage.trim());
    }
    client.logger.debug(embedFields, `Embed fields generated`);
    if (embedFields.length > 0) {
        previewEmbed.addFields(embedFields);
    }

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
