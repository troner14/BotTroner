import type { ApplicationCommandDataResolvable, AutocompleteInteraction, CommandInteraction, CommandInteractionOptionResolver, SlashCommandBuilder } from "discord.js"
import {ExtendedClient} from "@class/extendClient"


export interface RegisterCommandsOptions {
    commands: ApplicationCommandDataResolvable[]
    guildId?: string;
}

export interface RunOptions {
    client: ExtendedClient;
    interaction: CommandInteraction;
    args: CommandInteractionOptionResolver;
}

export interface autocomplete_type {
    client: ExtendedClient;
    interaction: AutocompleteInteraction;
    args: CommandInteractionOptionResolver;
}

type RunFunction = (options: RunOptions) => any;

type autocompleteFun = (options: autocomplete_type) => any

export type CommandType = {
    autocomplete: autocompleteFun;
    data: SlashCommandBuilder;
    enabled: boolean;
    run: RunFunction;
}
