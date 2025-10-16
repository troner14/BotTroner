import type { ExtendedClient } from "@src/class/extendClient";
import type { ChatInputCommandInteraction } from "discord.js";
import { guildCheckMiddleware } from "./middlewares/guild.check"
import { PanelHandler } from "./virtualization/panel";

const panelHandler = new PanelHandler()
    .use(guildCheckMiddleware);

export async function virtualizationHandler(client: ExtendedClient, interaction: ChatInputCommandInteraction) {
    const group = interaction.options.getSubcommandGroup(false);
    if (group === "panel") {
        await panelHandler.handle({ client, interaction });
    }
}