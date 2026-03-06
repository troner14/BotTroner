import { VmEmbedGenerator } from "@src/class/virtualization/utils/embedGenerator";
import type { selMenuType } from "@dTypes/components";
import { MessageFlags } from "discord.js";

export const data: selMenuType["data"] = {
    name: "vm-subuser-perms"
};

export const optionalParams = {
    panelId: "number",
    vmId: "string",
    targetUserId: "string",
    assignedById: "string"
};

export const type: selMenuType["type"] = "selectmenu";

export const run: selMenuType["run"] = async ({ interaction, client }) => {
    const [, panelIdRaw, vmId, targetUserId, assignedById] = interaction.customId.split("_");

    if (!panelIdRaw || !vmId || !targetUserId || !assignedById) {
        await interaction.reply({
            content: "❌ Configuración inválida del selector de permisos.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (interaction.user.id !== assignedById) {
        await interaction.reply({
            content: "❌ Solo el usuario que inició la configuración puede asignar estos permisos.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const panelId = Number(panelIdRaw);
    if (Number.isNaN(panelId)) {
        await interaction.reply({
            content: "❌ Panel inválido.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const allowedActions = interaction.values;
    const vmManager = client.virtualization;

    await interaction.deferUpdate();

    const vmResult = await vmManager.getVM(panelId, vmId);
    if (!vmResult.success || !vmResult.data) {
        await interaction.editReply({
            content: `❌ Error al obtener la VM (${vmId}): ${vmResult.error}`,
            components: []
        });
        return;
    }

    try {
        if (!interaction.guildId) {
            await interaction.editReply({
                content: "❌ No se pudo validar la guild del subuser.",
                components: []
            });
            return;
        }

        try {
            const guild = await client.guilds.fetch(interaction.guildId);
            await guild.members.fetch(targetUserId);
        } catch {
            await interaction.editReply({
                content: "❌ El usuario objetivo no está en la guild de esta VM.",
                components: []
            });
            return;
        }

        // Revalidate that the assigning user still has subusers permission
        const assignerMember = await (await client.guilds.fetch(interaction.guildId)).members.fetch(assignedById);
        const assignerRoleIds = assignerMember.roles.cache.map(r => r.id);
        const hasSubusersPerm = await client.permissions.hasVMPermission(
            assignedById,
            assignerRoleIds,
            vmId,
            "subusers"
        );
        if (!hasSubusersPerm) {
            await interaction.editReply({
                content: "❌ Ya no tienes permiso de 'subusers' para esta VM.",
                components: []
            });
            return;
        }

        await client.permissions.setVMUserPermissions(
            vmId,
            targetUserId,
            allowedActions,
            interaction.user.id
        );

        const targetUser = await client.users.fetch(targetUserId);
        const dmChannel = await targetUser.createDM();

        const vmStatus = vmResult.data;
        const embed = VmEmbedGenerator.generateStatusEmbed(vmStatus);
        const components = VmEmbedGenerator.generateControlButtons(vmStatus, allowedActions);

        const message = await dmChannel.send({
            embeds: [embed],
            components
        });

        if (vmManager.monitor) {
            vmManager.monitor.addMonitor({
                guildId: interaction.guildId || "dm",
                channelId: dmChannel.id,
                messageId: message.id,
                panelId,
                vmId,
                userId: targetUser.id,
                lastUpdate: Date.now()
            });
        }

        await interaction.editReply({
            content: `✅ Subuser configurado: ${targetUser.toString()} ahora controla la VM **${vmStatus.name}** (${vmId}) con permisos: ${allowedActions.map((p: string) => `\`${p}\``).join(", ")}.`,
            components: []
        });
    } catch {
        await interaction.editReply({
            content: "❌ No se pudo completar la configuración del subuser (permisos o envío de DM).",
            components: []
        });
    }
};
