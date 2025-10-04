import { SlashCommandBuilder } from "discord.js";
import type { runCommand, autocompleteCommand } from "@dTypes/commandBuilder"
import type { Builder } from "@dTypes/builder";


export class CommandBuilder extends SlashCommandBuilder implements Builder {
    #runner: runCommand | null = null;
    #autocomplete: autocompleteCommand | null = null;
    #enabled: boolean = true;
    
    constructor() {
        super();
    }

    set enabled(enabled: boolean) {
        this.#enabled = enabled;
    }
    get enabled(): boolean {
        return this.#enabled;
    }

    set runner(runner: runCommand) {
        this.#runner = runner;
    }

    get runner() {
        if (!this.#runner) throw new Error("Runner not set for this command");
        return this.#runner;
    }

    set autocomplete(autocomplete: autocompleteCommand) {
        this.#autocomplete = autocomplete;
    }

    get autocomplete() {
        if (!this.#autocomplete) throw new Error("Autocomplete not set for this command");
        return this.#autocomplete;
    }
}