import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Colors } from "discord.js";
import type { VMStatus } from "@bot/virtualization";

export class VmEmbedGenerator {

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

    static generateControlButtons(vm: VMStatus) {
        const startBtn = new ButtonBuilder()
            .setCustomId(`vm-start_${vm.id}`)
            .setLabel("Iniciar")
            .setEmoji("🟢")
            .setStyle(ButtonStyle.Success)
            .setDisabled(vm.status === "running");

        const stopBtn = new ButtonBuilder()
            .setCustomId(`vm-stop_${vm.id}`)
            .setLabel("Apagar")
            .setEmoji("🔴")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(vm.status === "stopped");

        const restartBtn = new ButtonBuilder()
            .setCustomId(`vm-restart_${vm.id}`)
            .setLabel("Reiniciar")
            .setEmoji("🔄")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(vm.status === "stopped");

        const stopMonitorBtn = new ButtonBuilder()
            .setCustomId(`vm-monitor-stop_${vm.id}`)
            .setLabel("Cerrar Panel")
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(startBtn, stopBtn, restartBtn, stopMonitorBtn);

        return [row];
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
