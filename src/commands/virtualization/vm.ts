import { CommandBuilder } from "@class/builders/CommandBuilder";
import { VirtualizationManager } from "@class/virtualization/VirtualizationManager";
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { VMStatus } from "@class/virtualization/interfaces/IVirtualizationProvider";

const command = new CommandBuilder();

command.setName("vm")
    .setDescription("Gestionar máquinas virtuales")
    .addSubcommand(subcommand =>
        subcommand
            .setName("list")
            .setDescription("Listar todas las VMs disponibles")
            .addIntegerOption(option =>
                option
                    .setName("panel")
                    .setDescription("ID del panel de virtualización")
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName("status")
            .setDescription("Ver el estado de una VM específica")
            .addIntegerOption(option =>
                option
                    .setName("panel")
                    .setDescription("ID del panel de virtualización")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("vm-id")
                    .setDescription("ID de la máquina virtual")
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName("action")
            .setDescription("Ejecutar una acción en una VM")
            .addIntegerOption(option =>
                option
                    .setName("panel")
                    .setDescription("ID del panel de virtualización")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("vm-id")
                    .setDescription("ID de la máquina virtual")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("action")
                    .setDescription("Acción a ejecutar")
                    .setRequired(true)
                    .addChoices(
                        { name: "Iniciar", value: "start" },
                        { name: "Detener", value: "stop" },
                        { name: "Reiniciar", value: "restart" },
                        { name: "Pausar", value: "pause" },
                        { name: "Reanudar", value: "resume" },
                        { name: "Resetear", value: "reset" }
                    )
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName("panels")
            .setDescription("Gestionar paneles de virtualización")
            .addStringOption(option =>
                option
                    .setName("action")
                    .setDescription("Acción sobre paneles")
                    .setRequired(true)
                    .addChoices(
                        { name: "Listar", value: "list" },
                        { name: "Info", value: "info" },
                        { name: "Stats", value: "stats" }
                    )
            )
            .addIntegerOption(option =>
                option
                    .setName("panel-id")
                    .setDescription("ID del panel (para info)")
                    .setRequired(false)
            )
    );

command.runner = async ({ client, interaction, args }) => {
    const subcommand = args.getSubcommand();
    const vmManager = new VirtualizationManager(client.prisma);

    try {
        switch (subcommand) {
            case "list":
                await handleListVMs(vmManager, interaction, args);
                break;
            case "status":
                await handleVMStatus(vmManager, interaction, args);
                break;
            case "action":
                await handleVMAction(vmManager, interaction, args);
                break;
            case "panels":
                await handlePanels(vmManager, interaction, args);
                break;
            default:
                await interaction.reply({
                    content: "❌ Subcomando no reconocido",
                    ephemeral: true
                });
        }
    } catch (error) {
        console.error("Error in VM command:", error);
        if (!interaction.replied) {
            await interaction.reply({
                content: "❌ Ha ocurrido un error interno",
                ephemeral: true
            });
        }
    }
};

// Función para listar VMs
async function handleListVMs(vmManager: VirtualizationManager, interaction: any, args: any) {
    await interaction.deferReply();

    const panelId = args.getInteger("panel");
    const guildId = interaction.guildId;

    try {
        if (panelId) {
            // Listar VMs de un panel específico
            const result = await vmManager.listVMs(panelId);
            
            if (!result.success || !result.data) {
                await interaction.editReply({
                    content: `❌ Error al obtener VMs: ${result.error}`
                });
                return;
            }

            const embed = createVMListEmbed(result.data, `Panel ${panelId}`, result.provider);
            const components = createVMActionButtons(result.data.slice(0, 5)); // Máximo 5 botones

            await interaction.editReply({
                embeds: [embed],
                components: components.length > 0 ? components : undefined
            });
        } else {
            // Obtener estadísticas generales
            const statsResult = await vmManager.getStats(guildId);
            
            if (!statsResult.success || !statsResult.data) {
                await interaction.editReply({
                    content: `❌ Error al obtener estadísticas: ${statsResult.error}`
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle("📊 Resumen de Virtualización")
                .setColor(0x00AE86)
                .addFields(
                    { name: "🖥️ Paneles", value: `${statsResult.data.activePanels}/${statsResult.data.totalPanels}`, inline: true },
                    { name: "🔧 Total VMs", value: statsResult.data.totalVMs.toString(), inline: true },
                    { name: "▶️ En ejecución", value: statsResult.data.runningVMs.toString(), inline: true },
                    { name: "⏹️ Detenidas", value: statsResult.data.stoppedVMs.toString(), inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    } catch (error) {
        await interaction.editReply({
            content: "❌ Error interno al procesar la solicitud"
        });
    }
}

// Función para ver estado de VM
async function handleVMStatus(vmManager: VirtualizationManager, interaction: any, args: any) {
    await interaction.deferReply();

    const panelId = args.getInteger("panel");
    const vmId = args.getString("vm-id");

    try {
        const result = await vmManager.getVM(panelId, vmId);
        
        if (!result.success || !result.data) {
            await interaction.editReply({
                content: `❌ Error al obtener información de la VM: ${result.error}`
            });
            return;
        }

        const vm = result.data;
        const embed = createVMStatusEmbed(vm, panelId, result.provider);
        const components = createVMControlButtons(panelId, vmId, vm.status);

        await interaction.editReply({
            embeds: [embed],
            components: [components]
        });
    } catch (error) {
        await interaction.editReply({
            content: "❌ Error interno al obtener el estado de la VM"
        });
    }
}

// Función para ejecutar acciones
async function handleVMAction(vmManager: VirtualizationManager, interaction: any, args: any) {
    await interaction.deferReply();

    const panelId = args.getInteger("panel");
    const vmId = args.getString("vm-id");
    const actionType = args.getString("action") as any;
    const userId = interaction.user.id;

    try {
        const result = await vmManager.executeVMAction(
            panelId,
            { type: actionType, vmId },
            userId
        );

        if (!result.success || !result.data) {
            await interaction.editReply({
                content: `❌ Error al ejecutar la acción: ${result.error}`
            });
            return;
        }

        const actionResult = result.data;
        const embed = new EmbedBuilder()
            .setTitle(`✅ Acción ${actionType} ejecutada`)
            .setColor(actionResult.success ? 0x57F287 : 0xED4245)
            .addFields(
                { name: "VM", value: vmId, inline: true },
                { name: "Panel", value: panelId.toString(), inline: true },
                { name: "Estado", value: actionResult.success ? "✅ Éxito" : "❌ Error", inline: true },
                { name: "Mensaje", value: actionResult.message }
            );

        if (actionResult.taskId) {
            embed.addFields({ name: "Task ID", value: actionResult.taskId, inline: true });
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply({
            content: "❌ Error interno al ejecutar la acción"
        });
    }
}

// Función para gestionar paneles
async function handlePanels(vmManager: VirtualizationManager, interaction: any, args: any) {
    await interaction.deferReply();

    const action = args.getString("action");
    const panelId = args.getInteger("panel-id");
    const guildId = interaction.guildId;

    try {
        switch (action) {
            case "list":
                const panelsResult = await vmManager.getPanelsByGuild(guildId);
                if (!panelsResult.success || !panelsResult.data) {
                    await interaction.editReply({
                        content: `❌ Error al obtener paneles: ${panelsResult.error}`
                    });
                    return;
                }

                const panelsEmbed = new EmbedBuilder()
                    .setTitle("🖥️ Paneles de Virtualización")
                    .setColor(0x5865F2);

                if (panelsResult.data.length === 0) {
                    panelsEmbed.setDescription("No hay paneles configurados");
                } else {
                    const panelsList = panelsResult.data.map(panel => 
                        `**${panel.id}** - ${panel.name} (${panel.type})${panel.isDefault ? " 🌟" : ""}`
                    ).join("\n");
                    panelsEmbed.setDescription(panelsList);
                }

                await interaction.editReply({ embeds: [panelsEmbed] });
                break;

            case "info":
                if (!panelId) {
                    await interaction.editReply({
                        content: "❌ Debes especificar el ID del panel"
                    });
                    return;
                }

                const systemResult = await vmManager.getSystemInfo(panelId);
                if (!systemResult.success || !systemResult.data) {
                    await interaction.editReply({
                        content: `❌ Error al obtener información del sistema: ${systemResult.error}`
                    });
                    return;
                }

                const systemInfo = systemResult.data;
                const systemEmbed = new EmbedBuilder()
                    .setTitle(`🖥️ Panel ${panelId} - Información del Sistema`)
                    .setColor(0x00AE86)
                    .addFields(
                        { name: "Versión", value: systemInfo.version || "Desconocida", inline: true },
                        { name: "Proveedor", value: systemResult.provider || "Desconocido", inline: true },
                        { name: "Nodos", value: systemInfo.nodes?.length.toString() || "0", inline: true }
                    );

                if (systemInfo.nodes && systemInfo.nodes.length > 0) {
                    const nodesList = systemInfo.nodes.slice(0, 5).map((node: any) => 
                        `**${node.name}**: ${node.status}`
                    ).join("\n");
                    systemEmbed.addFields({ name: "Estado de Nodos", value: nodesList });
                }

                await interaction.editReply({ embeds: [systemEmbed] });
                break;

            case "stats":
                const statsResult = await vmManager.getStats(guildId);
                if (!statsResult.success || !statsResult.data) {
                    await interaction.editReply({
                        content: `❌ Error al obtener estadísticas: ${statsResult.error}`
                    });
                    return;
                }

                const stats = statsResult.data;
                const statsEmbed = new EmbedBuilder()
                    .setTitle("📊 Estadísticas de Virtualización")
                    .setColor(0xFEE75C)
                    .addFields(
                        { name: "🖥️ Paneles Totales", value: stats.totalPanels.toString(), inline: true },
                        { name: "✅ Paneles Activos", value: stats.activePanels.toString(), inline: true },
                        { name: "🔧 VMs Totales", value: stats.totalVMs.toString(), inline: true },
                        { name: "▶️ VMs Ejecutándose", value: stats.runningVMs.toString(), inline: true },
                        { name: "⏹️ VMs Detenidas", value: stats.stoppedVMs.toString(), inline: true },
                        { name: "📈 Ratio Actividad", value: `${stats.totalVMs > 0 ? Math.round((stats.runningVMs / stats.totalVMs) * 100) : 0}%`, inline: true }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [statsEmbed] });
                break;
        }
    } catch (error) {
        await interaction.editReply({
            content: "❌ Error interno al procesar paneles"
        });
    }
}

// Funciones helper para crear embeds y componentes
function createVMListEmbed(vms: VMStatus[], title: string, provider?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle(`🖥️ ${title}`)
        .setColor(0x5865F2);

    if (provider) {
        embed.setFooter({ text: `Proveedor: ${provider}` });
    }

    if (vms.length === 0) {
        embed.setDescription("No se encontraron máquinas virtuales");
        return embed;
    }

    const vmList = vms.slice(0, 10).map(vm => {
        const statusEmoji = getStatusEmoji(vm.status);
        const cpuInfo = vm.cpu_usage !== undefined ? ` (CPU: ${vm.cpu_usage.toFixed(1)}%)` : "";
        return `${statusEmoji} **${vm.name}** (${vm.id})${cpuInfo}`;
    }).join("\n");

    embed.setDescription(vmList);

    if (vms.length > 10) {
        embed.addFields({ name: "ℹ️", value: `... y ${vms.length - 10} VMs más` });
    }

    return embed;
}

function createVMStatusEmbed(vm: VMStatus, panelId: number, provider?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle(`🖥️ ${vm.name}`)
        .setColor(vm.status === 'running' ? 0x57F287 : 0xED4245)
        .addFields(
            { name: "ID", value: vm.id, inline: true },
            { name: "Panel", value: panelId.toString(), inline: true },
            { name: "Estado", value: `${getStatusEmoji(vm.status)} ${vm.status}`, inline: true }
        );

    if (vm.uptime !== undefined) {
        embed.addFields({ name: "Uptime", value: formatUptime(vm.uptime), inline: true });
    }

    if (vm.cpu_usage !== undefined) {
        embed.addFields({ name: "CPU", value: `${vm.cpu_usage.toFixed(1)}%`, inline: true });
    }

    if (vm.memory_usage !== undefined) {
        embed.addFields({ name: "Memoria", value: `${Math.round(vm.memory_usage / 1024 / 1024)} MB`, inline: true });
    }

    if (provider) {
        embed.setFooter({ text: `Proveedor: ${provider}` });
    }

    embed.setTimestamp();
    return embed;
}

function createVMActionButtons(vms: VMStatus[]): ActionRowBuilder<ButtonBuilder>[] {
    if (vms.length === 0) return [];

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    const buttonsPerRow = 5;

    for (let i = 0; i < vms.length && i < 25; i += buttonsPerRow) {
        const row = new ActionRowBuilder<ButtonBuilder>();
        const sliceEnd = Math.min(i + buttonsPerRow, vms.length);
        
        for (let j = i; j < sliceEnd; j++) {
            const vm = vms[j];
            if (vm) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`vm_quick_${vm.id}`)
                        .setLabel(`${vm.name.slice(0, 15)}`)
                        .setEmoji(getStatusEmoji(vm.status))
                        .setStyle(vm.status === 'running' ? ButtonStyle.Success : ButtonStyle.Secondary)
                );
            }
        }
        
        rows.push(row);
    }

    return rows;
}

function createVMControlButtons(panelId: number, vmId: string, status: VMStatus['status']): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

    if (status === 'stopped') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`vm_action_${panelId}_${vmId}_start`)
                .setLabel("Iniciar")
                .setEmoji("▶️")
                .setStyle(ButtonStyle.Success)
        );
    } else if (status === 'running') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`vm_action_${panelId}_${vmId}_stop`)
                .setLabel("Detener")
                .setEmoji("⏹️")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`vm_action_${panelId}_${vmId}_restart`)
                .setLabel("Reiniciar")
                .setEmoji("🔄")
                .setStyle(ButtonStyle.Primary)
        );
    }

    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`vm_refresh_${panelId}_${vmId}`)
            .setLabel("Actualizar")
            .setEmoji("🔄")
            .setStyle(ButtonStyle.Secondary)
    );

    return row;
}

function getStatusEmoji(status: VMStatus['status']): string {
    switch (status) {
        case 'running': return '🟢';
        case 'stopped': return '🔴';
        case 'paused': return '🟡';
        case 'suspended': return '🟠';
        default: return '⚪';
    }
}

function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

export default command;