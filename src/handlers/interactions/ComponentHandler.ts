import type { Interaction } from "discord.js";
import { BaseHandler, type HandlerContext } from "@handlers/core/BaseHandler";

type ComponentType = "button" | "modal" | "selectmenu";

interface ComponentHandlerOptions {
    type: ComponentType;
    clientKey: keyof any;
}

export class ComponentHandler<T extends Interaction = Interaction> extends BaseHandler<T> {
    private readonly clientKey: keyof any;
    private readonly type: ComponentType;

    constructor(options: ComponentHandlerOptions) {
        super(`component:${options.type}`);
        this.type = options.type;
        this.clientKey = options.clientKey;
    }

    async handle(context: HandlerContext<T>): Promise<void> {
        const { interaction, client } = context;
        // @ts-ignore
        let customId = interaction.customId;
        let optionalParams: { [key: string]: any } = {};
        let queryParams: any[] = [];
        if (typeof customId === "string" && customId.includes("_")) {
            const optParams = customId.split("_");
            customId = optParams.shift() ?? "";
            queryParams = optParams;
        }
        const collection = client[this.clientKey as unknown as keyof typeof client] as Map<string, any> | undefined;
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
