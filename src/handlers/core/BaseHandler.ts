import type { ExtendedClient } from "@class/extendClient";
import { AutocompleteInteraction, MessageFlags, type Interaction } from "discord.js";
import { logger } from "@utils/logger";
import type { Logger } from "pino";

export interface HandlerContext<T extends Interaction = Interaction> {
    interaction: T;
    client: ExtendedClient;
    params?: Record<string, any>;
    metadata?: Record<string, any>;
}

export interface HandlerResult {
    success: boolean;
    error?: Error;
    metadata?: Record<string, any>;
}

export interface IMiddleware<T extends Interaction = Interaction> {
    name: string;
    priority: number;
    execute(context: HandlerContext<T>): Promise<HandlerResult | void>;
}

export abstract class BaseHandler<T extends Interaction = Interaction> {
    protected readonly logger: Logger;
    protected middlewares: IMiddleware<T>[] = [];

    constructor(protected name: string) {
        this.logger = logger.child({ handler: `Handler:${name}` });
    }

    /**
     * Añade middleware al handler
     */
    use(middleware: IMiddleware<T>): this {
        this.middlewares.push(middleware);
        this.middlewares.sort((a, b) => a.priority - b.priority);
        return this;
    }

    /**
     * Ejecuta los middlewares en orden de prioridad
     */
    protected async executeMiddlewares(context: HandlerContext<T>): Promise<boolean> {
        for (const middleware of this.middlewares) {
            try {
                const result = await middleware.execute(context);
                if (result && !result.success) {
                    this.logger.warn(`Middleware ${middleware.name} failed: ${result.error?.message}`);
                    return false;
                }
            } catch (error) {
                this.logger.error(error, `Middleware ${middleware.name} threw error:`);
                return false;
            }
        }
        return true;
    }

    /**
     * Parsea los parámetros del customId
     */
    protected parseCustomId(customId: string): { id: string; params: string[] } {
        if (!customId.includes("_")) {
            return { id: customId, params: [] };
        }
        
        const parts = customId.split("_");
        const id = parts.shift() || "";
        return { id, params: parts };
    }

    /**
     * Manejo centralizado de errores
     */
    protected async handleError(error: Error, context: HandlerContext<T>): Promise<void> {
        this.logger.error({
            error: error.message,
            stack: error.stack,
            interaction: {
                type: context.interaction.type,
                user: context.interaction.user?.id,
                guild: context.interaction.guildId,
                customId: 'customId' in context.interaction ? context.interaction.customId : undefined
            }
        }, `Error in ${this.name} handler:`);

        // Responder al usuario si no se ha respondido ya
        try {
            if (!(context.interaction instanceof AutocompleteInteraction) && !context.interaction.replied && !context.interaction.deferred) {
                await context.interaction.reply({
                    content: "❌ Ha ocurrido un error inesperado. Por favor, intenta de nuevo más tarde.",
                    flags: MessageFlags.Ephemeral
                });
            }
        } catch (replyError) {
            this.logger.error(replyError, "Failed to send error response:");
        }
    }

    /**
     * Método abstracto que cada handler debe implementar
     */
    abstract handle(context: HandlerContext<T>): Promise<void>;

    /**
     * Ejecuta el handler con middleware y manejo de errores
     */
    async execute(context: HandlerContext<T>): Promise<void> {
        const start = performance.now();
        try {
            // Ejecutar middlewares
            const middlewaresPassed = await this.executeMiddlewares(context);
            if (!middlewaresPassed) {
                return;
            }

            // Ejecutar handler principal
            await this.handle(context);
            const end = performance.now();
            this.logger.debug(`Handled interaction in ${(end - start).toFixed(2)} ms`);
        } catch (error) {
            await this.handleError(error as Error, context);
        }
    }
}
