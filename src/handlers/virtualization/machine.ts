import { BaseHandler, type HandlerContext } from "@handlers/core/BaseHandler";
import { Paginator } from "@src/class/utils/Paginator";
import type { ManagerResult, VMStatus } from "@src/class/virtualization/interfaces/IVirtualizationProvider";
import type { VirtualizationManager } from "@src/class/virtualization/VirtualizationManager";
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, MessageFlags, type ChatInputCommandInteraction, type InteractionReplyOptions } from "discord.js";

export class MachineHandler extends BaseHandler<ChatInputCommandInteraction> {
    constructor() {
        super("Machine");
    }

    private async getListVMs(vmManager: VirtualizationManager, guildId: string, panelId?: number): Promise<ManagerResult<VMStatus[]>> {
        let success: boolean = false;
        let data: VMStatus[] | undefined;
        let error: string | undefined;
        if (!panelId) {
            const panels = await vmManager.getPanelsByGuild(guildId);
            if (panels.success && (!panels.data || panels.data.length === 0)) {
                return {
                    success: false,
                    error: "No se encontraron paneles asociados a este servidor."
                };
            }
            this.logger.debug(`Found ${panels.data?.length ?? 0} panels for guild ${guildId}`);
            if (panels.data) {
                for (const panel of panels.data) {
                    const res = await vmManager.listVMs(panel.id);
                    success = res.success;
                    error = res.error;
                    if (!data) {
                        data = res.data as VMStatus[];
                    } else {
                        data.concat(res.data as VMStatus[]);
                    }
                }
            }
        } else {
            const res = await vmManager.listVMs(panelId);
            success = res.success;
            error = res.error;
            data = res.data as VMStatus[];
        }
        
        if (success && data?.length === 0) {
            return {
                success: false,
                error: "No se encontraron máquinas virtuales."
            };
        }
        if (success && data) {
            return {
                success: true,
                data: data.sort((a, b) => parseInt(a.id) - parseInt(b.id))
            };
        } else {
            return {
                success: false,
                error: error
            };
        }
    }

    async handle(context: HandlerContext<ChatInputCommandInteraction>): Promise<void> {
        const { interaction, client } = context;
        const args = interaction.options;
        const command = args.getSubcommand();
        const vmManager = client.virtualization;

        switch (command) {
            case "list":
                const panelid = args.getInteger("panel");
                const guildId = interaction.guildId as string;
                const info = await this.getListVMs(vmManager, guildId, panelid ?? undefined);

                if (!info.success || !info.data) {
                    await interaction.reply({
                        content: `Error al obtener las máquinas virtuales: ${info.error}`,
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                const paginator = new Paginator(info.data, 3);

                const createEmbed = () => {
                    const pageData = paginator.getPageData();
                    const embed = new EmbedBuilder()
                        .setTitle("🖥️ Máquinas Virtuales")
                        .setColor(0x0099ff)
                        .setFooter({ 
                            text: `Página ${pageData.page + 1} de ${pageData.totalPages} • Total: ${info.data!.length} VMs` 
                        });

                    pageData.items.forEach(vm => {
                        const statusEmoji = vm.status === 'running' ? '🟢' : '🔴';
                        embed.addFields({ 
                            name: `${statusEmoji} ${vm.name}`, 
                            value: `**Node:**${vm.node}\n**ID:** ${vm.id}\n**Tipo:** ${vm.type}\n**Estado:** ${vm.status}`,
                            inline: true,
                        });
                    });

                    return embed;
                };

                const msg = await interaction.reply({
                    embeds: [createEmbed()],
                    components: [paginator.createButtons()],
                    flags: MessageFlags.Ephemeral
                });

                const collector = msg.createMessageComponentCollector({ 
                    time: 300_000,
                    filter: (i) => i.user.id === interaction.user.id
                });
                
                collector.on('collect', async (i) => {
                    if (await paginator.handleInteraction(i as ButtonInteraction)) {
                        await i.update({
                            embeds: [createEmbed()],
                            components: [paginator.createButtons()]
                        });
                    }
                });

                break;
        }

    }
}