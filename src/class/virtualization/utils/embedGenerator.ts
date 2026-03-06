import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Colors } from "discord.js";
import type { VMStatus } from "../interfaces/IVirtualizationProvider";

export class VmEmbedGenerator {

    private static canUseAction(action: "start" | "stop" | "restart", allowedActions?: string[]) {
        if (!allowedActions || allowedActions.length === 0) return true;
        return allowedActions.includes("*") || allowedActions.includes(action);
    }

    private static canManageSubusers(allowedActions?: string[]) {
        if (!allowedActions || allowedActions.length === 0) return false;
        return allowedActions.includes("*") || allowedActions.includes("subusers");
    }

    private static canResetPassword(allowedActions?: string[]) {
        if (!allowedActions || allowedActions.length === 0) return false;
        return allowedActions.includes("*") || allowedActions.includes("resetpass");
    }

    static generateStatusEmbed(vm: VMStatus, imageUrl?: string) {
        const status = vm.status === "running" ? "iniciada" : "apagada";
        const cpuUsage = vm.cpu_usage ? vm.cpu_usage.toFixed(2) : "0";
        const ramUsage = vm.memory_usage ? (vm.memory_usage / 1024 / 1024 / 1024).toFixed(2) : "0";
        // Note: We might want to pass max values in VMStatus if available for better display

        const embed = new EmbedBuilder()
            .setTitle(`Gestionar estado ${vm.name}`)
            .setDescription(`
                **Estado**: ${status === "iniciada" ? "🟢 Online" : "🔴 Offline"}
                **CPU**: ${cpuUsage}%
                **RAM**: ${ramUsage} GB
                **Uptime**: ${this.formatUptime(vm.uptime || 0)}
            `)
            .setColor(vm.status === "running" ? Colors.Green : Colors.Red)
            .setTimestamp();

        if (imageUrl) {
            embed.setThumbnail(imageUrl);
        }

        return embed;
    }

    static generateControlButtons(vm: VMStatus, allowedActions?: string[]) {
        const controls: ButtonBuilder[] = [];

        if (this.canUseAction("start", allowedActions)) {
            controls.push(
                new ButtonBuilder()
                    .setCustomId(`vm-start_${vm.id}`)
                    .setLabel("Iniciar")
                    .setEmoji("🟢")
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(vm.status === "running")
            );
        }

        if (this.canUseAction("stop", allowedActions)) {
            controls.push(
                new ButtonBuilder()
                    .setCustomId(`vm-stop_${vm.id}`)
                    .setLabel("Apagar")
                    .setEmoji("🔴")
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(vm.status === "stopped")
            );
        }

        if (this.canUseAction("restart", allowedActions)) {
            controls.push(
                new ButtonBuilder()
                    .setCustomId(`vm-restart_${vm.id}`)
                    .setLabel("Reiniciar")
                    .setEmoji("🔄")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(vm.status === "stopped")
            );
        }

        const stopMonitorBtn = new ButtonBuilder()
            .setCustomId(`vm-monitor-stop_${vm.id}`)
            .setLabel("Cerrar Panel")
            .setStyle(ButtonStyle.Secondary);

        const resetPasswordBtn = this.canResetPassword(allowedActions)
            ? new ButtonBuilder()
                .setCustomId(`vm-resetpass_${vm.id}`)
                .setLabel("Reset Password")
                .setStyle(ButtonStyle.Secondary)
            : null;

        const manageSubusersBtn = this.canManageSubusers(allowedActions)
            ? new ButtonBuilder()
                .setCustomId(`vm-manage-subusers_${vm.id}`)
                .setLabel("Gestionar subusers")
                .setStyle(ButtonStyle.Secondary)
            : null;

        const allButtons: ButtonBuilder[] = [
            ...controls,
            ...(resetPasswordBtn ? [resetPasswordBtn] : []),
            ...(manageSubusersBtn ? [manageSubusersBtn] : []),
            stopMonitorBtn
        ];

        const rows: ActionRowBuilder<ButtonBuilder>[] = [];
        for (let i = 0; i < allButtons.length; i += 5) {
            rows.push(
                new ActionRowBuilder<ButtonBuilder>().addComponents(...allButtons.slice(i, i + 5))
            );
        }

        return rows;
    }

    static generatePanelStatusEmbed(info: any, panelId: number) {
        const embed = new EmbedBuilder()
            .setTitle(`Información del Panel ID ${panelId}`)
            .setDescription(`**Version**: ${info.version}`)
            .setFooter({ text: "Auto-actualizado cada 5s" })
            .setTimestamp();

        for (const node of info.nodes) {
            const resources = node.resources;

            // Format uptime if not already formatted (assuming it comes as seconds from API?)
            // Based on panel.ts it seemed to manipulate it. 
            // We should use our formatUptime helper if raw seconds, or use as is if string.
            // Looking at panel.ts, it calculates it manually. Let's use our helper if number.

            let uptimeStr = "";
            if (typeof resources.uptime === 'number') {
                uptimeStr = this.formatUptime(resources.uptime);
            } else {
                uptimeStr = resources.uptime;
            }

            embed.addFields(
                {
                    name: `Nodo: ${node.name}`,
                    value: `CPU: ${resources.cpu.used.toFixed(3)} / ${resources.cpu.total} Cores\nMemoria: ${(resources.memory.used / 1024).toFixed(2)} / ${(resources.memory.total / 1024).toFixed(2)} GB\nUpTime: ${uptimeStr}`,
                    inline: false
                }
            );
        }

        return embed;
    }

    private static formatUptime(seconds: number): string {
        if (!seconds) return "0s";
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor(seconds % (3600 * 24) / 3600);
        const m = Math.floor(seconds % 3600 / 60);

        const parts = [];
        if (d > 0) parts.push(`${d}d`);
        if (h > 0) parts.push(`${h}h`);
        if (m > 0) parts.push(`${m}m`);
        if (parts.length === 0) parts.push(`${Math.floor(seconds)}s`);

        return parts.join(" ");
    }
}
