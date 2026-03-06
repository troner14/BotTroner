import { BaseHandler, type HandlerContext } from "@handlers/core/BaseHandler";
import { ActionRowBuilder, MessageFlags, StringSelectMenuBuilder, type ChatInputCommandInteraction } from "discord.js";

export class MonitorHandler extends BaseHandler<ChatInputCommandInteraction> {
    constructor() {
        super("Monitor");
    }

    async handle(context: HandlerContext<ChatInputCommandInteraction>): Promise<void> {
        const { interaction, client } = context;
        const subcommand = interaction.options.getSubcommand();
        const vmManager = client.virtualization;

        if (subcommand === "start") {
            const panelId = interaction.options.getInteger("panel", true);
            const vmId = interaction.options.getString("vm-id", true);
            const targetUser = interaction.options.getUser("user", true);

            // 1. Check if VM exists and get initial status
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const vmResult = await vmManager.getVM(panelId, vmId);
            if (!vmResult.success || !vmResult.data) {
                await interaction.editReply({
                    content: `❌ Error al obtener la VM (Panel ID: ${panelId}, VM ID: ${vmId}): ${vmResult.error}`
                });
                return;
            }

            const vmStatus = vmResult.data;

            const selector = new StringSelectMenuBuilder()
                .setCustomId(`vm-subuser-perms_${panelId}_${vmId}_${targetUser.id}_${interaction.user.id}`)
                .setPlaceholder("Selecciona los permisos de control para el subuser")
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

            const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selector);

            await interaction.editReply({
                content: `Configura los permisos del subuser ${targetUser.toString()} para la VM **${vmStatus.name}** (${vmId}).`,
                components: [row]
            });

        } else if (subcommand === "stop") {
            const vmId = interaction.options.getString("vm-id", true);

            if (vmManager.monitor) {
                await vmManager.monitor.stopMonitorForVM(vmId);
                await interaction.reply({
                    content: `✅ Monitoreo detenido para la VM ${vmId}.`,
                    flags: MessageFlags.Ephemeral
                });
            } else {
                await interaction.reply({
                    content: `⚠️ El sistema de monitoreo no está activo.`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
}
