import { BaseLoader } from "./base";
import { getFiles } from "@src/utils/file";


export class ComponentsLoader extends BaseLoader {
    #components: Map<string, any> = new Map();
    #cacheComponents: Map<string, string> = new Map();

    constructor() {
        super("Components");
        ComponentsLoader.singleTone = this;
    }

    get info() {
        return this.#components;
    }

    public async reload() {
        this.clearCache();
        this.#components.clear();
        this.#cacheComponents.clear();
        await this.load();
        return this.info;
    }

    public async load(): Promise<void> {
        const start = performance.now();
        const files = getFiles("components");
        for (const file of files) {
            const component = (await import(`${file}`)).default;
            if (!component || !component.customId) {
                this.logger.error(`component in ${file} is not valid.`);
                continue;
            }
            this.#components.set(component.customId, component);
            this.#cacheComponents.set(component.customId, file);
            this.logger.info(`component ${component.customId} loaded.`);
        }
        const end = performance.now();
        this.logger.info(`Loaded ${this.#components.size} components in ${(end - start).toFixed(2)}ms`);
    }
}