import type { modalsType } from "@dTypes/components";
import { MessageFlags } from "discord.js";

export const data: modalsType["data"] = {
    name: "vm-resetpass-modal"
};

export const optionalParams: modalsType["optionalParams"] = {
    panelId: "number",
    vmId: "string"
};

export const type: modalsType["type"] = "modals";

export const run: modalsType["run"] = async ({ interaction, client, optionalParams }) => {
    const panelId = Number(optionalParams?.["panelId"]);
    const vmId = optionalParams?.["vmId"] as string;

    if (!panelId || !vmId) {
        await interaction.reply({
            content: "❌ Datos inválidos para reset de contraseña.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const username = interaction.fields.getTextInputValue("username").trim();
    const password = interaction.fields.getTextInputValue("password").trim();

    if (!username || !password) {
        await interaction.reply({
            content: "❌ Debes indicar usuario y contraseña.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await client.virtualization.resetVMPassword(
        panelId,
        vmId,
        username,
        password,
        interaction.user.id,
        interaction.guildId ?? undefined
    );

    if (!result.success) {
        await interaction.editReply(`❌ Error al resetear contraseña: ${result.error ?? "Error desconocido"}`);
        return;
    }

    await interaction.editReply(`✅ Contraseña reseteada para el usuario **${username}** en la VM **${vmId}**.`);
};
