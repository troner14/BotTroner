import { BaseHandler, type HandlerContext } from "@handlers/core/BaseHandler";
import { MessageFlags, type ChatInputCommandInteraction } from "discord.js";


export class PanelHandler extends BaseHandler<ChatInputCommandInteraction> {
    constructor() {
        super("PanelHandler");
    }

    async handle(context: HandlerContext<ChatInputCommandInteraction>): Promise<void> {
        const { interaction, client } = context;
        const args = interaction.options;
        const command = args.getSubcommand();
        const vmManager = client.virtualization;
        switch (command) {
            case "list":
                const { success, data } = await vmManager.getPanelsByGuild(interaction.guildId!);
                if (success && data?.length === 0) {
                    await interaction.reply({
                        content: "❌ No hay paneles de virtualización configurados para este servidor",
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }
                if (success && data) {
                    const panelList = data.map(panel => `**${panel.name}** (${panel.type}) - ${panel.apiUrl} ${panel.isDefault ? '[Predeterminado]' : ''}`).join("\n");
                    await interaction.reply({
                        content: `🖥️ **Paneles de Virtualización:**\n${panelList}`,
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }
                break;
            case "new":
                const name = args.getString("name", true);
                const url = args.getString("url", true);
                const apiKey = args.getString("api-key", true);
                const provider = args.getString("provider", true);
                const createResult = await vmManager.addPanel(interaction.guildId!, name, provider, url, {
                    type: 'token',
                    data: { token: apiKey }
                });
                if (createResult.success) {
                    await interaction.reply({
                        content: `✅ Panel de virtualización **${name}** creado con ID ${createResult.data?.id}`,
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    await interaction.reply({
                        content: `❌ Error al crear el panel: ${createResult.error || 'Error desconocido'}`,
                        flags: MessageFlags.Ephemeral
                    });
                }
                break;
            case "delete":
                const panelId = args.getInteger("panel-id", true);
                const deleteResult = await vmManager.removePanel(panelId);
                if (deleteResult.success) {
                    await interaction.reply({
                        content: `✅ Panel de virtualización con ID ${panelId} eliminado`,
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    await interaction.reply({
                        content: `❌ Error al eliminar el panel: ${deleteResult.error || 'Error desconocido'}`,
                        flags: MessageFlags.Ephemeral
                    });
                }
                break;
            default:
                await interaction.reply({
                    content: "❌ Subcomando no reconocido",
                    flags: MessageFlags.Ephemeral
                });
        }
    }
}