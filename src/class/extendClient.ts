import logger from "@src/utils/logger";
import { Client, GatewayIntentBits } from "discord.js";
import { prisma } from "@class/prismaClient";
import { CommandsLoader } from "./loaders/Commands";
import { EventsLoader } from "./loaders/events";
import { ComponentsLoader } from "./loaders/components";
import { VirtualizationManager } from "./virtualization/VirtualizationManager";
import { VirtualizationMonitor } from "./virtualization/VirtualizationMonitor";
import Tickets from "./tickets/tickets";
import type { Announcement } from "@src/types/announcements";
import { loadTranslations } from "@src/utils/translate";


export class ExtendedClient extends Client {
    logger = logger.child({ module: "ExtendedClient" });
    #prisma: typeof prisma;

    private commandsLoader: CommandsLoader;
    private eventsLoader: EventsLoader;
    private componentsLoader: ComponentsLoader;
    private virtualizationManager: VirtualizationManager;
    private ticketSystem: Tickets;
    private pendingAnnouncements: Map<string, Announcement>;

    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildInvites,
                GatewayIntentBits.GuildIntegrations,
                GatewayIntentBits.GuildModeration,
                GatewayIntentBits.DirectMessages,
            ]
        });
        this.#prisma = prisma;

        this.commandsLoader = new CommandsLoader(this);
        this.eventsLoader = new EventsLoader(this);
        this.componentsLoader = new ComponentsLoader();
        this.virtualizationManager = new VirtualizationManager(this.#prisma);
        // Initialize monitor
        this.virtualizationManager.monitor = new VirtualizationMonitor(this, this.virtualizationManager);

        this.ticketSystem = new Tickets(this);
        this.pendingAnnouncements = new Map();
    }

    get prisma() {
        return this.#prisma;
    }

    get ticket() {
        return this.ticketSystem;
    }

    async start() {
        try {
            await this.login(process.env.botToken);

            // Start virtualization monitor
            this.virtualizationManager.monitor?.start();

            await this.prepare();
        } catch (error) {
            this.logger.error(error);
        }
    }

    async shutdown() {
        this.logger.info("Shutting down...");

        try {
            // Disconnect from virtualization panels
            this.virtualizationManager.monitor?.stop();
            await this.virtualizationManager.disconnectAll();
            this.logger.debug("Virtualization panels disconnected.");

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
        await loadTranslations();
        await this.commandsLoader.load();
        await Promise.all(
            this.guilds.cache.map(guild => {
                return this.commandsLoader.RegisterCommands(guild.id);
            })
        );
        await this.eventsLoader.load();
        await this.componentsLoader.load();
    }

    get commands() {
        return this.commandsLoader.info;
    }

    get components() {
        return this.componentsLoader.info;
    }

    get buttons() {
        return this.componentsLoader.buttons;
    }

    get modals() {
        return this.componentsLoader.modals;
    }

    get selectMenus() {
        return this.componentsLoader.selectMenus;
    }

    get virtualization() {
        return this.virtualizationManager;
    }

    get announcements() {
        return this.pendingAnnouncements;
    }
}