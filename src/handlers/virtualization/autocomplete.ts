import { type AutocompleteInteraction } from "discord.js";
import { BaseHandler, type HandlerContext } from "../core/BaseHandler";


export class AutocompleteHandler extends BaseHandler<AutocompleteInteraction> {
    constructor() {
        super("PanelAutocomplete");
    }

    async handle(context: HandlerContext<AutocompleteInteraction>): Promise<void> {
        const { interaction, client } = context;
        const args = interaction.options;
        const command = args.getSubcommand();
        const focusedOption = args.getFocused(true);
        const vmManager = client.virtualization;

        if (focusedOption.name === "panel") {
            const { success, data } = await vmManager.getPanelsByGuild(interaction.guildId!);
            if (success && data) {
                const choices = data.map(panel => ({ name: `${panel.name}`, value: panel.id }));
                const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedOption.value.toString().toLowerCase()));
                await interaction.respond(
                    filtered.slice(0, 25)
                );
            } else {
                await interaction.respond([]);
            }
        } else if (command === "new" && focusedOption.name === "provider") {
            const providers = vmManager.getAvailableProviders();
            const choices = providers.map(provider => ({ name: provider, value: provider }));
            const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedOption.value.toString().toLowerCase()));
            await interaction.respond(
                filtered.slice(0, 25)
            );
        } else if (focusedOption.name === "vm-id") {
            const panelId = args.getInteger("panel", true);
            const { success, data} = await vmManager.listVMs(panelId);
            if (success && data) {
                const choices = data.map(vm => ({ name: `${vm.name}`, value: vm.id }));
                const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedOption.value.toString().toLowerCase()));
                await interaction.respond(
                    filtered.slice(0, 25)
                );
            } else {
                await interaction.respond([]);
            }
        }
    }
}