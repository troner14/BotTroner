import { handleInteraction} from "@handlers/interactions"
import type { ExtendedClient } from "@src/class/extendClient";
import { Events, type Interaction } from "discord.js"

export const name = Events.InteractionCreate;
export const once = false
export const active = true

export const run = async (interaction: Interaction, client: ExtendedClient) => {
    await handleInteraction(interaction, client);
}
