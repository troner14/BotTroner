import { type AutocompleteInteraction} from "discord.js";
import { BaseHandler } from "../core/BaseHandler";
import type { ExtendedClient } from "@src/class/extendClient";


export class AutocompleteHandler extends BaseHandler<AutocompleteInteraction> {
    constructor() {
        super("TicketAutocompleteHandler");
    }

    async handle(context: { interaction: AutocompleteInteraction, client: ExtendedClient}): Promise<void> {
        const { interaction, client } = context;
        const args = interaction.options;
        const input = args.getFocused(true);

        switch (input.name) {
            case "add":
                break;
            case "remove":
                break;
        }
    }
}