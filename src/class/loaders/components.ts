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

    get buttons() {
        const buttons = new Map<string, any>();
        for (const [key, component] of this.#components) {
            if (component.type === "button") {
                buttons.set(key, component);
            }
        }
        return buttons;
    }

    get selectMenus() {
        const selectMenus = new Map<string, any>();
        for (const [key, component] of this.#components) {
            if (component.type === "selectmenu") {
                selectMenus.set(key, component);
            }
        }
        return selectMenus;
    }

    get modals() {
        const modals = new Map<string, any>();
        for (const [key, component] of this.#components) {
            if (component.type === "modals") {
                modals.set(key, component);
            }
        }
        return modals;
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
            const component = (await import(`${file}`));
            if (!component || !component.data?.name) {
                this.logger.error(`component in ${file} is not valid.`);
                continue;
            }
            const customId = component.data.name;
            this.#components.set(customId, component);
            this.#cacheComponents.set(customId, file);
            this.logger.debug(`component ${customId} loaded.`);
        }
        const end = performance.now();
        this.logger.info(`Loaded ${this.#components.size} components in ${(end - start).toFixed(2)}ms`);
    }
}