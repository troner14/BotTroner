import logger from "@src/utils/logger";
import { Client } from "discord.js";
import { Prisma, PrismaClient } from '@prismaClient';
import type { DefaultArgs } from "generated/prisma/runtime/library";
import { CommandsLoader } from "./loaders/Commands";
import { EventsLoader } from "./loaders/events";
import { ComponentsLoader } from "./loaders/components";


export class ExtendedClient extends Client {
    logger = logger.child({module: "ExtendedClient"});
    #prisma: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>;

    private commandsLoader: CommandsLoader;
    private eventsLoader: EventsLoader;
    private componentsLoader: ComponentsLoader;

    constructor() {
        super({intents: 3276799});
        this.#prisma = new PrismaClient();
        
        this.commandsLoader = new CommandsLoader(this);
        this.eventsLoader = new EventsLoader(this);
        this.componentsLoader = new ComponentsLoader();
    }

    get prisma() {
        return this.#prisma;
    }

    async start() {
        try {
            await this.login(process.env.botToken);
            await this.prepare();
        } catch (error) {
            this.logger.error(error);
        }
    }

    async shutdown() {
        this.logger.info("Shutting down...");
        
        try {
            
            // Disconnect from Prisma
            await this.#prisma.$disconnect();
            this.logger.debug("Prisma disconnected.");
            
            // Destroy Discord client connection
            this.destroy();
            this.logger.debug("Client destroyed.");
            
            // Give some time for cleanup
            setTimeout(() => {
                this.logger.debug("Graceful shutdown completed.");
                process.exit(0);
            }, 100);
            
        } catch (error) {
            this.logger.error({ error }, "Error during shutdown");
            process.exit(1);
        }
    }

    async prepare() {
        await this.commandsLoader.load();
        await this.eventsLoader.load();
        await this.componentsLoader.load();
    }

    get commands() {
        return this.commandsLoader.info;
    }
}