import type{ Logger } from "pino";
import logger from "@src/utils/logger";

export abstract class BaseLoader {
    public logger: Logger;
    #cache: Map<string, string> = new Map();
    protected static singleTone: BaseLoader | undefined;

    constructor(loaderName: string = "BaseLoader") {
        this.logger = logger.child({module: loaderName});
    }


    public static getInstance(): BaseLoader {
        if (!this.singleTone) {
            throw new Error("getInstance() must be implemented in the derived class.");
        }
        return this.singleTone;
    }

    protected clearCache() {
        this.#cache.forEach((file, name) => {
            delete require.cache[require.resolve(file)];
            this.logger.info(`Cache for command ${name} cleared.`);
        });
    }

    public abstract get info(): any;

    public abstract load(): Promise<void>;
    public abstract reload(): Promise<any>;
}