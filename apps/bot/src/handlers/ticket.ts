import type { ExtendedClient } from "@src/class/extendClient";
import type { Interaction } from "discord.js";
import {CategoryHandler} from "./tickets/category";
import {ConfigHandler} from "./tickets/config";
import {UserHandler} from "./tickets/user";
import {TicketsHandler} from "./tickets/ticket";
import { AutocompleteHandler } from "./tickets/autocomplete";

const categoryHandler = new CategoryHandler();
const configHandler = new ConfigHandler();
const userHandler = new UserHandler();
const ticketsHandler = new TicketsHandler();

const autocompleteHandler = new AutocompleteHandler();


export async function handleTickets(interaction: Interaction, client: ExtendedClient) {
    if (interaction.isAutocomplete()) {
        await autocompleteHandler.execute({ interaction, client });
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const subcommandGroup = interaction.options.getSubcommandGroup(false);

    if (subcommandGroup) {
        switch (subcommandGroup) {
            case "category":
                await categoryHandler.execute({ interaction, client });
                break;
            case "config":
                await configHandler.execute({ interaction, client });
                break;
            case "user":
                await userHandler.execute({ interaction, client });
                break;
        }
    } else {
        await ticketsHandler.execute({ interaction, client });
    }

}