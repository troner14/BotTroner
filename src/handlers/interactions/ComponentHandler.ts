import type { Interaction, ButtonInteraction, ModalSubmitInteraction, StringSelectMenuInteraction } from "discord.js";
import { BaseHandler, type HandlerContext } from "@handlers/core/BaseHandler";
import type { ExtendedClient } from "@class/extendClient";

type ComponentType = "button" | "modal" | "selectmenu";

type ComponentInteraction = ButtonInteraction | ModalSubmitInteraction | StringSelectMenuInteraction;

interface ComponentHandlerOptions {
    type: ComponentType;
    clientKey: keyof ExtendedClient;
}

export class ComponentHandler<T extends Interaction = Interaction> extends BaseHandler<T> {
    private readonly clientKey: keyof ExtendedClient;
    private readonly type: ComponentType;

    constructor(options: ComponentHandlerOptions) {
        super(`component:${options.type}`);
        this.type = options.type;
        this.clientKey = options.clientKey;
    }

    async handle(context: HandlerContext<T>): Promise<void> {
        const { interaction, client } = context;
        
        // Type guard to ensure interaction has customId
        if (!('customId' in interaction)) {
            throw new Error(`Interaction does not have customId property`);
        }
        
        let customId = interaction.customId;
        let optionalParams: Record<string, unknown> = {};
        let queryParams: string[] = [];
        if (typeof customId === "string" && customId.includes("_")) {
            const optParams = customId.split("_");
            customId = optParams.shift() ?? "";
            queryParams = optParams;
        }
        const collection = client[this.clientKey] as Map<string, unknown> | undefined;
        const component = collection?.get(customId);
        if (component?.optionalParams && queryParams.length > 0) {
            const optionalParamsKeys = Object.keys(component.optionalParams);
            optionalParamsKeys.forEach((key: string, i: number) => {
                const value = queryParams[i];
                optionalParams[key] = value;
            });
        }
        if (!component) throw new Error(`El código del ${this.type} no existe`);
        try {
            await component.run({
                interaction,
                client,
                optionalParams
            });
        } catch (err) {
            this.logger.error(err);
        }
    }
}
