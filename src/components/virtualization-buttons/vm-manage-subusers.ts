import type { Buttons } from "@src/types/components";
import {
    ActionRowBuilder,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    type ButtonInteraction
} from "discord.js";

export const data: Buttons["data"] = {
    name: "vm-manage-subusers"
};

export const optionalParams: Buttons["optionalParams"] = {
    id: "string"
};

export const type: Buttons["type"] = "button";

export const run: Buttons["run"] = async ({ interaction, client, optionalParams }) => {
    const vmId = optionalParams?.["id"] as string;
    const button = interaction as ButtonInteraction;

    const entry = client.virtualization.monitor?.getMonitorByMessageId(button.message.id);
    if (!entry) {
        await button.reply({
            content: "❌ No se pudo resolver el contexto del panel para gestionar subusers.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const canManage = await client.permissions.hasVMPermission(button.user.id, [], vmId, "subusers");
    if (!canManage) {
        await button.reply({
            content: "❌ No tienes permiso para gestionar subusers en esta VM.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const modal = new ModalBuilder()
        .setCustomId(`vm-subuser-id-modal_${entry.panelId}_${vmId}_${entry.guildId}_${button.user.id}`)
        .setTitle("Gestionar subusers");

    const userIdInput = new TextInputBuilder()
        .setCustomId("target-user-id")
        .setLabel("ID de Discord del usuario")
        .setStyle(TextInputStyle.Short)
        .setMinLength(17)
        .setMaxLength(20)
        .setPlaceholder("Ejemplo: 495874245516066816")
        .setRequired(true);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(userIdInput);
    modal.addComponents(row);

    await button.showModal(modal);
};
