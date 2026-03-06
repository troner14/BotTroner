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
    name: "vm-resetpass"
};

export const optionalParams: Buttons["optionalParams"] = {
    id: "string"
};

export const type: Buttons["type"] = "button";

export const run: Buttons["run"] = async ({ interaction, client, optionalParams }) => {
    const vmId = optionalParams?.["id"] as string;
    const button = interaction as ButtonInteraction;
    const vmManager = client.virtualization;

    const monitorEntry = vmManager.monitor?.getMonitorByMessageId(button.message.id);
    if (!monitorEntry) {
        await button.reply({
            content: "❌ No se pudo resolver el panel de esta VM.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const canResetPass = await client.permissions.hasVMPermission(button.user.id, [], vmId, "resetpass");
    if (!canResetPass) {
        await button.reply({
            content: "❌ No tienes permiso para resetear la contraseña de esta VM.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const modal = new ModalBuilder()
        .setCustomId(`vm-resetpass-modal_${monitorEntry.panelId}_${vmId}`)
        .setTitle("Resetear contraseña VM");

    const usernameInput = new TextInputBuilder()
        .setCustomId("username")
        .setLabel("Usuario dentro de la VM")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(64)
        .setPlaceholder("root o usuario del sistema operativo");

    const passwordInput = new TextInputBuilder()
        .setCustomId("password")
        .setLabel("Nueva contraseña")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(6)
        .setMaxLength(128)
        .setPlaceholder("Introduce la nueva contraseña");

    const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(usernameInput);
    const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(passwordInput);
    modal.addComponents(row1, row2);

    await button.showModal(modal);
};
