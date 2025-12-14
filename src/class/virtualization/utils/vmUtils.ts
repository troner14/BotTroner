import type { ButtonInteraction } from "discord.js";
import type { VirtualizationManager } from "../VirtualizationManager";

export async function findPanel(vmManager: VirtualizationManager, interaction: ButtonInteraction, vmId: string): Promise<number | null> {
    if (vmManager.monitor) {
        const entry = vmManager.monitor.getMonitorByMessageId(interaction.message.id);
        if (entry) return entry.panelId;
    }
    if (interaction.guildId) {
        const panels = await vmManager.getPanelsByGuild(interaction.guildId);
        if (panels.success && panels.data) {
            for (const panel of panels.data) {
                const vm = await vmManager.getVM(panel.id, vmId);
                if (vm.success && vm.data) return panel.id;
            }
        }
    }
    return null;
}
