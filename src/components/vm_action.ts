import { VirtualizationManager } from "@class/virtualization/VirtualizationManager";
import { EmbedBuilder } from "discord.js";
import type { RunOptions } from "@dTypes/components";

export const data = {
    name: "vm_action"
};

export const type = "button";

export const run = async ({ client, interaction, optionalParams }: RunOptions) => {
    if (!interaction.isButton()) return;

    await interaction.deferReply({ ephemeral: true });

    try {
        // Parse del customId: vm_action_{panelId}_{vmId}_{action}
        const parts = interaction.customId.split('_');
        if (parts.length !== 4 || !parts[1] || !parts[2] || !parts[3]) {
            await interaction.editReply({
                content: "❌ ID de botón inválido"
            });
            return;
        }

        const panelId = parseInt(parts[1]);
        const vmId = parts[2];
        const action = parts[3] as any;

        if (isNaN(panelId)) {
            await interaction.editReply({
                content: "❌ ID de panel inválido"
            });
            return;
        }

        const vmManager = new VirtualizationManager(client.prisma);
        const userId = interaction.user.id;

        // Ejecutar la acción
        const result = await vmManager.executeVMAction(
            panelId,
            { type: action, vmId },
            userId
        );

        if (!result.success || !result.data) {
            await interaction.editReply({
                content: `❌ Error al ejecutar ${action}: ${result.error}`
            });
            return;
        }

        const actionResult = result.data;
        const embed = new EmbedBuilder()
            .setTitle(`✅ Acción ${action} ejecutada`)
            .setColor(actionResult.success ? 0x57F287 : 0xED4245)
            .addFields(
                { name: "VM", value: vmId, inline: true },
                { name: "Panel", value: panelId.toString(), inline: true },
                { name: "Usuario", value: `<@${userId}>`, inline: true },
                { name: "Estado", value: actionResult.success ? "✅ Éxito" : "❌ Error", inline: false },
                { name: "Mensaje", value: actionResult.message }
            )
            .setTimestamp();

        if (actionResult.taskId) {
            embed.addFields({ name: "Task ID", value: actionResult.taskId, inline: true });
        }

        await interaction.editReply({ embeds: [embed] });

        // Log adicional para auditoría
        client.logger.info({
            userId,
            guildId: interaction.guildId,
            panelId,
            vmId,
            action,
            success: actionResult.success,
            taskId: actionResult.taskId
        }, "VM action executed via button");

    } catch (error) {
        client.logger.error({ error }, "Error in VM action button handler");
        
        if (!interaction.replied) {
            await interaction.editReply({
                content: "❌ Error interno al procesar la acción"
            });
        }
    }
};

export default { data, type, run };