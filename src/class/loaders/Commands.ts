import {getFiles} from "@utils/file";
import type { CommandBuilder } from "@class/builders/CommandBuilder";
import type { ApplicationCommandDataResolvable } from "discord.js";
import { BaseLoader } from "./base";
import type { ExtendedClient } from "../extendClient";
import type { guilds_commandos } from "@prismaClient";

type commandsOmit = Omit<guilds_commandos, "enabled">;
interface commands extends commandsOmit {
    commands: Set<string> | undefined;
}

export class CommandsLoader extends BaseLoader {
    #commands: Map<string, CommandBuilder> = new Map();
    #cacheCommands: Map<string, string> = new Map();
    #guildCommands: Map<string, Set<string>> = new Map();
    #client: ExtendedClient

    constructor(client: ExtendedClient) {
        super("Commands");
        this.#client = client;
        CommandsLoader.singleTone = this;
    }

    public static override getInstance(): CommandsLoader {
        if (!this.singleTone) {
            throw new Error("getInstance() must be implemented in the derived class.");
        }
        return this.singleTone;
    };

    get info() {
        return this.#commands;
    }

    public get commandsArray(): ApplicationCommandDataResolvable[] {
        return Array.from(this.#commands.values()).map(cmd => cmd.toJSON());
    }

    public async reload() {
        this.clearCache();
        this.#commands.clear();
        this.#cacheCommands.clear();
        await this.load();
        return this.commandsArray;
    }

    private isValidCommand(file: string, command: CommandBuilder): boolean {
        if (!command.enabled) {
            this.logger.warn(`command in ${file} is disabled.`);
            return false;
        }
        if (!command.name) {
            this.logger.error(`command in ${file} has no name.`);
            return false;
        }
        if (!command.description) {
            this.logger.warn(`command ${command.name} dosen't have description`);
            return false;
        }
        if (!command.runner) {
            this.logger.error(`command ${command.name} dosn't have run code to execute verify its correct`);
            return false;
        }
        return true;
    }

    public async RegisterCommands(guildId: string): Promise<void> {
        const guild = await this.#client.guilds.fetch(guildId).catch(() => null);
        if (!guild) {
            this.logger.error(`Guild with ID ${guildId} not found.`);
            return;
        }
        let commands = this.commandsArray;
        if (this.#guildCommands.has(guildId)) {
            commands = Array.from(this.#commands.values())
                .filter(cmd => this.#guildCommands.get(guildId)?.has(cmd.name))
                .map(cmd => cmd.toJSON());
        }
        guild.commands.set(commands);
        this.logger.debug(`Registered ${commands.length} commands to guild ${guildId}`);
    }

    public async refreshGuildCommands(guildId: string): Promise<void> {
        const guild = await this.#client.guilds.fetch(guildId).catch(() => null);
        if (!guild) {
            this.logger.error(`Guild with ID ${guildId} not found.`);
            throw new Error(`Guild with ID ${guildId} not found.`, { cause: "GuildNotFound" });
        }
        this.#guildCommands.delete(guildId);
        const guildsCommands = await this.#client.prisma.guilds_commandos.findMany({
            where: {
                enabled: true,
                guildId: guildId
            },
            select: {
                CommId: true
            }
        });

        if (guildsCommands.length > 0) {
            const commandSet = new Set(guildsCommands.map(cmd => cmd.CommId));
            this.#guildCommands.set(guildId, commandSet);
        }
    }

    public async load(): Promise<void> {
        const start = performance.now();
        const files = getFiles("commands");
        
        const guildsCommandsRaw = await this.#client.prisma.guilds_commandos.findMany({
            where: {
                enabled: true
            },
            select: {
                guildId: true,
                CommId: true
            }
        });


        const guildsCommandsMap = new Map<string, string[]>();
        guildsCommandsRaw.forEach(record => {
            if (!guildsCommandsMap.has(record.guildId)) {
                guildsCommandsMap.set(record.guildId, []);
            }
            guildsCommandsMap.get(record.guildId)!.push(record.CommId);
        });

        // Convert to the expected format
        const guildsCommands: commands[] = Array.from(guildsCommandsMap.entries()).map(([guildId, commIds]) => ({
            guildId,
            CommId: commIds.join(","),
            commands: undefined
        }));

        guildsCommands.forEach(guild => {
            const commIdString = guild["CommId"]?.trim();
            if (!commIdString) {
                guild["commands"] = new Set();
                return;
            }
            const commandsSet = new Set(commIdString.split(",").map(cmd => cmd.trim()));
            guild["commands"] = commandsSet;
        });
        for (const file of files) {
            try {
                const commandImport = (await import(`${file}`));
                if (!commandImport || !commandImport.default) {
                    this.logger.error(`no te la exportacio per defecte ${file}`);
                    continue;
                }
                const command: CommandBuilder = commandImport.default;
                if (this.isValidCommand(file, command)) {                
                    if (!this.#commands.has(command.name)) this.#commands.set(command.name, command);
                    if (!this.#cacheCommands.has(command.name)) this.#cacheCommands.set(command.name, file);
                    if (guildsCommands.length > 0) {
                        guildsCommands.forEach(guild => {
                            if (guild.commands?.has(command.name)) {
                                if (!this.#guildCommands.has(guild.guildId)) {
                                    this.#guildCommands.set(guild.guildId, new Set());
                                }
                                this.#guildCommands.get(guild.guildId)?.add(command.name);
                            }
                        });
                    }
                }
                this.logger.debug(`Loaded command: ${command.name}`);
            } catch (err) {
                this.logger.error(err, `Error al importar fitxer:  ${file}:`);
            }
        }
        
        const end = performance.now();
        this.logger.info(`Loaded ${files.length} commands in ${(end - start).toFixed(2)}ms`);
    }
}

