import { BaseHandler, type HandlerContext } from "@handlers/core/BaseHandler";
import { VmEmbedGenerator } from "@src/class/virtualization/utils/embedGenerator";
import { MessageFlags, type ChatInputCommandInteraction } from "discord.js";

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
                    content: `❌ Error al obtener la VM: ${vmResult.error}`
                });
                return;
            }

            const vmStatus = vmResult.data;

            // 2. Create DM Channel
            try {
                const dmChannel = await targetUser.createDM();

                // 3. Generate initial message
                const embed = VmEmbedGenerator.generateStatusEmbed(vmStatus);
                const components = VmEmbedGenerator.generateControlButtons(vmStatus);

                const message = await dmChannel.send({
                    embeds: [embed],
                    components: components
                });

                // 4. Register monitor
                if (vmManager.monitor) {
                    vmManager.monitor.addMonitor({
                        guildId: interaction.guildId || "dm",
                        channelId: dmChannel.id,
                        messageId: message.id,
                        panelId: panelId,
                        vmId: vmId,
                        userId: targetUser.id,
                        lastUpdate: Date.now()
                    });

                    await interaction.editReply({
                        content: `✅ Panel de monitoreo enviado a ${targetUser.toString()} para la VM **${vmStatus.name}** (${vmId}).`
                    });
                } else {
                    await interaction.editReply({
                        content: `⚠️ El sistema de monitoreo no está activo en este momento.`
                    });
                }

            } catch (error) {
                await interaction.editReply({
                    content: `❌ No se pudo enviar el DM al usuario. Asegúrate de que tenga los DMs abiertos.`
                });
            }

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
