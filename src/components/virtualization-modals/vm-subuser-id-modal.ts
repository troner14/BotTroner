import type { modalsType } from "@dTypes/components";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    MessageFlags,
    type GuildMember
} from "discord.js";

export const data: modalsType["data"] = {
    name: "vm-subuser-id-modal"
};

export const optionalParams: modalsType["optionalParams"] = {
    panelId: "number",
    vmId: "string",
    guildId: "string",
    managerId: "string"
};

export const type: modalsType["type"] = "modals";

export const run: modalsType["run"] = async ({ interaction, client, optionalParams }) => {
    const panelId = Number(optionalParams?.["panelId"]);
    const vmId = optionalParams?.["vmId"] as string;
    const guildId = optionalParams?.["guildId"] as string;
    const managerId = optionalParams?.["managerId"] as string;

    if (interaction.user.id !== managerId) {
        await interaction.reply({
            content: "❌ Solo quien inició esta gestión puede continuar.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const targetUserId = interaction.fields.getTextInputValue("target-user-id").trim();

    if (!/^\d{17,20}$/.test(targetUserId)) {
        await interaction.reply({
            content: "❌ La ID no es válida.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (targetUserId === interaction.user.id) {
        await interaction.reply({
            content: "❌ No puedes asignarte como subuser a ti mismo desde este flujo.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const canManage = await client.permissions.hasVMPermission(interaction.user.id, [], vmId, "subusers");
    if (!canManage) {
        await interaction.reply({
            content: "❌ Ya no tienes permiso para gestionar subusers en esta VM.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    let member: GuildMember | null = null;
    try {
        const guild = await client.guilds.fetch(guildId);
        member = await guild.members.fetch(targetUserId);
    } catch {
        member = null;
    }

    if (!member) {
        await interaction.reply({
            content: "❌ Ese usuario no está en la guild de esta VM.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const existing = await client.prisma.vm_permissions.findFirst({
        where: {
            vmId,
            userId: targetUserId
        }
    });

    if (existing) {
        const deleteBtn = new ButtonBuilder()
            .setCustomId(`vm-subuser-delete_${panelId}_${vmId}_${targetUserId}_${interaction.user.id}`)
            .setLabel("Eliminar subuser")
            .setStyle(ButtonStyle.Danger);

        const cancelBtn = new ButtonBuilder()
            .setCustomId(`vm-subuser-cancel_${interaction.user.id}`)
            .setLabel("Cancelar")
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(deleteBtn, cancelBtn);

        await interaction.reply({
            content: `⚠️ <@${targetUserId}> ya existe como subuser para la VM ${vmId}. ¿Quieres eliminarlo?`,
            components: [row],
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const selector = new StringSelectMenuBuilder()
        .setCustomId(`vm-subuser-perms_${panelId}_${vmId}_${targetUserId}_${interaction.user.id}`)
        .setPlaceholder("Selecciona permisos para el subuser")
        .setMinValues(1)
        .setMaxValues(5)
        .addOptions(
            {
                label: "Iniciar VPS",
                value: "start",
                description: "Permite arrancar la VPS"
            },
            {
                label: "Apagar VPS",
                value: "stop",
                description: "Permite detener la VPS"
            },
            {
                label: "Reiniciar VPS",
                value: "restart",
                description: "Permite reiniciar la VPS"
            },
            {
                label: "Reset Password",
                value: "resetpass",
                description: "Permite resetear contraseña de la VPS"
            },
            {
                label: "Gestionar subusers",
                value: "subusers",
                description: "Permite crear/eliminar subusers"
            }
        );

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selector);

    const cancelBtn = new ButtonBuilder()
        .setCustomId(`vm-subuser-cancel_${interaction.user.id}`)
        .setLabel("Cancelar")
        .setStyle(ButtonStyle.Secondary);

    const cancelRow = new ActionRowBuilder<ButtonBuilder>().addComponents(cancelBtn);

    await interaction.reply({
        content: `Selecciona qué permisos quieres asignar a <@${targetUserId}> en la VM ${vmId}.`,
        components: [selectRow, cancelRow],
        flags: MessageFlags.Ephemeral
    });
};
