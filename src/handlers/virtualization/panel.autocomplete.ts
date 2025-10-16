import { MessageFlags, type AutocompleteInteraction } from "discord.js";
import { BaseHandler, type HandlerContext } from "../core/BaseHandler";


export class PanelAutocompleteHandler extends BaseHandler<AutocompleteInteraction> {
    constructor() {
        super("PanelAutocomplete");
    }

    async handle(context: HandlerContext<AutocompleteInteraction>): Promise<void> {
        const { interaction, client } = context;
        const args = interaction.options;
        const command = args.getSubcommand();
        const focusedOption = args.getFocused(true);
        const vmManager = client.virtualization;

        console.log("Handling autocomplete for command:", command, "focused option:", focusedOption);

        if (command === "delete" && focusedOption.name === "panel-id") {
            const { success, data } = await vmManager.getPanelsByGuild(interaction.guildId!);
            if (success && data) {
                const choices = data.map(panel => ({ name: `${panel.name} (ID: ${panel.id})`, value: panel.id }));
                const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedOption.value.toString().toLowerCase()));
                await interaction.respond(
                    filtered.slice(0, 25)
                );
            }
        } else if (command === "new" && focusedOption.name === "provider") {
            const providers = vmManager.getAvailableProviders();
            const choices = providers.map(provider => ({ name: provider, value: provider }));
            const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedOption.value.toString().toLowerCase()));
            await interaction.respond(
                filtered.slice(0, 25)
            );
        }
    }
}