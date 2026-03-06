import type { ExtendedClient } from "@src/class/extendClient";
import type { AutocompleteInteraction, ChatInputCommandInteraction } from "discord.js";
import { guildCheckMiddleware } from "./middlewares/guild.check"
import { PermissionCheckMiddleware } from "./middlewares/permission.check";
import { PanelHandler } from "./virtualization/panel";
import { AutocompleteHandler } from "./virtualization/autocomplete";
import { MachineHandler } from "./virtualization/machine";
import { MonitorHandler } from "./virtualization/monitor";

const panelHandler = new PanelHandler()
    .use(guildCheckMiddleware)
    .use(new PermissionCheckMiddleware({
        "panel:list": "prox:panel:list",
        "panel:info": "prox:panel:info",
        "panel:new": "prox:panel:new",
        "panel:delete": "prox:panel:delete",
        "panel:setupstatus": "prox:panel:setupstatus",
    }));
const autocompleteHandler = new AutocompleteHandler();
const machineHandler = new MachineHandler()
    .use(guildCheckMiddleware)
    .use(new PermissionCheckMiddleware({
        "list": "prox:machine:list",
        "status": "prox:machine:status",
        "action": "prox:machine:action",
    }));
const monitorHandler = new MonitorHandler()
    .use(guildCheckMiddleware)
    .use(new PermissionCheckMiddleware({
        "start": "prox:monitor:start",
        "stop": "prox:monitor:stop",
    }));

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