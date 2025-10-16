import type { ExtendedClient } from "@src/class/extendClient";
import type { AutocompleteInteraction, ChatInputCommandInteraction } from "discord.js";
import { guildCheckMiddleware } from "./middlewares/guild.check"
import { PanelHandler } from "./virtualization/panel";
import { PanelAutocompleteHandler } from "./virtualization/panel.autocomplete";

const panelHandler = new PanelHandler()
    .use(guildCheckMiddleware);
const panelAutocompleteHandler = new PanelAutocompleteHandler();

export async function virtualizationHandler(client: ExtendedClient, interaction: ChatInputCommandInteraction | AutocompleteInteraction) {
    const group = interaction.options.getSubcommandGroup(false);
    if (interaction.isAutocomplete()) {
        if (group === "panel") {
            await panelAutocompleteHandler.handle({ client, interaction });
        }
    } else {
        if (group === "panel") {
            await panelHandler.handle({ client, interaction });
        }
    }
}