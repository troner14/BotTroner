import type { CommandInteraction, ButtonInteraction, ModalSubmitInteraction } from "discord.js";
import {ExtendedClient} from "@class/extendedClient"

export interface RunOptions {
    client: ExtendedClient
    interaction: ButtonInteraction
    optionalParams?: {[key:string]: any}
}

export interface runOptionsModal {
    client: ExtendedClient
    interaction: ModalSubmitInteraction
    optionalParams?: {[key:string]: any}
}

export interface runOptionsSelMenu {
    client: ExtendedClient
    interaction: AnySelectMenuInteraction
}

interface data {
    name: string;
}

// type RunFunction = (options: RunOptions) => any;
type RunFunction<T> = (options: T) => any;

export type Buttons = {
    data: data;
    type: "button";
    optionalParams?: {[key:string]: any};
    run: RunFunction<RunOptions>;
}

export type modalsType = {
    data: data;
    type: "modals";
    optionalParams?: {[key:string]: any};
    run: RunFunction<runOptionsModal>;
}

export type selMenuType = {
    data: data;
    type: "selectmenu";
    run: RunFunction<runOptionsSelMenu>;
}