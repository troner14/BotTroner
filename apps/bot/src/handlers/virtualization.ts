import type { ExtendedClient } from "@src/class/extendClient";
import type { AutocompleteInteraction, ChatInputCommandInteraction } from "discord.js";
import { guildCheckMiddleware } from "./middlewares/guild.check"
import { PanelHandler } from "./virtualization/panel";
import { AutocompleteHandler } from "./virtualization/autocomplete";
import { MachineHandler } from "./virtualization/machine";
import { MonitorHandler } from "./virtualization/monitor";

const panelHandler = new PanelHandler()
    .use(guildCheckMiddleware);
const autocompleteHandler = new AutocompleteHandler();
const machineHandler = new MachineHandler()
    .use(guildCheckMiddleware);
const monitorHandler = new MonitorHandler()
    .use(guildCheckMiddleware);

export async function virtualizationHandler(client: ExtendedClient, interaction: ChatInputCommandInteraction | AutocompleteInteraction) {
    const group = interaction.options.getSubcommandGroup(false);
    if (interaction.isAutocomplete()) {
        autocompleteHandler.handle({ client, interaction });
    } else {
        if (group === "panel") {
            await panelHandler.handle({ client, interaction });
        } else if (group === "monitor") {
            await monitorHandler.handle({ client, interaction });
        } else {
            machineHandler.handle({ client, interaction });
        }
    }
}