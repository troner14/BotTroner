import type { Interaction } from "discord.js";
import type { ExtendedClient } from "@class/extendClient";
import { CommandHandler } from "@handlers/core/CommandHandler";
import { AutocompleteHandler } from "@handlers/core/AutocompleteHandler";
import { ComponentHandler } from "./core/ComponentHandler";
import { activityLogMiddleware } from "./middlewares/logger";


// Instancias de handlers
const commandHandler = new CommandHandler()
    .use(activityLogMiddleware);
const buttonHandler = new ComponentHandler({ type: "button", clientKey: "button" })
    .use(activityLogMiddleware);
const selectMenuHandler = new ComponentHandler({ type: "selectmenu", clientKey: "selectmenu" })
    .use(activityLogMiddleware);
const modalHandler = new ComponentHandler({ type: "modal", clientKey: "modals" })
    .use(activityLogMiddleware);
const autocompleteHandler = new AutocompleteHandler()
    .use(activityLogMiddleware);

export async function handleInteraction(interaction: Interaction, client: ExtendedClient) {
	// Ruteo según el tipo de interacción
	if (interaction.isCommand() && interaction.isChatInputCommand()) {
		await commandHandler.execute({ interaction, client });
	} else if (interaction.isButton()) {
		await buttonHandler.execute({ interaction, client });
	} else if (interaction.isStringSelectMenu()) {
		await selectMenuHandler.execute({ interaction, client });
	} else if (interaction.isAutocomplete()) {
		await autocompleteHandler.execute({ interaction, client });
	} else if (interaction.isModalSubmit()) {
		await modalHandler.execute({ interaction, client });
	}
}
