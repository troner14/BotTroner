import type { ExtendedClient } from "../extendClient";
import { BaseLoader } from "./base";
import { getFiles } from "@src/utils/file";

export class EventsLoader extends BaseLoader {
    #events: Map<string, any> = new Map();
    #cacheEvents: Map<string, string> = new Map();
    #client: ExtendedClient

    constructor(client: ExtendedClient) {
        super("Events");
        this.#client = client;
        EventsLoader.singleTone = this;
    }

    public get info() {
        return this.#events;
    }

    public async reload() {
        this.clearCache();
        this.#events.clear();
        this.#cacheEvents.clear();
        await this.load();
        return this.info;
    }

    public async load(): Promise<void> {
        const start = performance.now();
        const files = getFiles("events");
        for (const file of files) {
            const event = (await import(`${file}`));
            this.#cacheEvents.set(event.name, file);
            if (!event || !event.name) {
                this.logger.error(`event in ${file} is not valid.`);
                continue;
            }
            if (!event.active) {
                this.logger.info(`event ${event.name} is disabled.`);
                continue;
            }
            this.#events.set(event.name, event);
            if (event.once) {
                this.#client.once(event.name, event.run);
                this.logger.debug(`event once ${event.name} loaded.`);
            } else {
                this.#client.on(event.name, (...args) => event.run(...args, this.#client));
                this.logger.debug(`event on ${event.name} loaded.`);
            }
        }

        const end = performance.now();
        this.logger.info(`Loaded ${this.#events.size} events in ${(end - start).toFixed(2)}ms`);
    }
}