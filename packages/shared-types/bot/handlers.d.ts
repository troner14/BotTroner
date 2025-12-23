import type { ButtonInteraction } from "discord.js";
import { RunOptions } from "./commands";

// interaction handler
export interface InteractionsHandlerType {
    "commands": (interaction: CommandInteraction, client: ExtendedClient) => Promise<void>;
    "buttons": (interaction: ButtonInteraction, client: ExtendedClient) => Promise<void>;
    "selectMenus": (interaction: AnySelectMenuInteraction, client: ExtendedClient) => Promise<void>;
    "autocomplete": (interaction: AutocompleteInteraction, client: ExtendedClient) => Promise<void>;
    "modals": (interaction: ModalSubmitInteraction, client: ExtendedClient) => Promise<void>;
}


// proxmox handler

export type handleProxmoxActionType = (interaction: ButtonInteraction) => Promise<void>;

export interface proxmoxHandlerType {
    ["status"]: {
        "get": (args: RunOptions) => Promise<void>;
        "set": (args: RunOptions) => Promise<void>;
        "manage": (args: RunOptions) => Promise<void>;
    },
    ["setup"]: {
        "user": (args: RunOptions) => Promise<void>;
        "logs": (args: RunOptions) => Promise<void>;
    }
    ["revoke"]: {
        "user": (args: RunOptions) => Promise<void>;
    }
    [""]: {
        "new": (args: RunOptions) => Promise<void>;
        "resetpass": (args: RunOptions) => Promise<void>;
    }
}

export type proxmoxGroupKey = keyof proxmoxHandlerType;
export type proxmoxSubcommandKey<T extends proxmoxGroupKey> = Extract<
    keyof proxmoxHandlerType[T],
    string
>;

// perms handler
export interface permsHandlerType {
    "create": (args: RunOptions) => Promise<void>;
    "delete": (args: RunOptions) => Promise<void>;
    "add": (args: RunOptions) => Promise<void>;
    "remove": (args: RunOptions) => Promise<void>;
    "list": (args: RunOptions) => Promise<void>;
}

export type permsCommands = keyof permsHandlerType;