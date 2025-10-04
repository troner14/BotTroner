import { test, expect, describe, beforeEach, mock } from "bun:test";
import { CommandsLoader } from "../../src/class/loaders/Commands";
import { MockClient } from "../mocks/discord.mock";
import { mockPrisma } from "../mocks/prisma.mock";
import { CommandBuilder } from "../../src/class/CommandBuilder";

const mockExtendedClient = {
    prisma: mockPrisma,
    guilds: new MockClient().guilds
} as any;

// Mock command examples
const createMockCommand = (name: string, description: string, enabled: boolean = true) => {
    const command = new CommandBuilder()
        .setName(name)
        .setDescription(description);
    command.enabled = enabled;
    if (enabled) {
        command.runner = mock(async (interaction) => {
            await interaction.reply(`${name} executed!`);
        });
    }
    return command;
};

const mockPingCommand = createMockCommand("ping", "Ping command");
const mockHelpCommand = createMockCommand("help", "Help command");
const mockDisabledCommand = createMockCommand("disabled", "Disabled command", false);

describe("CommandsLoader", () => {
    let commandsLoader: CommandsLoader;

    beforeEach(() => {
        // Reset mocks
        mockPrisma.$queryRaw.mockClear();
        mockPrisma.$queryRaw.mockResolvedValue([
            {
                guildId: "test-guild-1",
                CommId: "ping,help"
            }
        ]);

        commandsLoader = new CommandsLoader(mockExtendedClient);
    });

    describe("Constructor", () => {
        test("should create CommandsLoader instance", () => {
            expect(commandsLoader).toBeInstanceOf(CommandsLoader);
        });

        test("should set singleton", () => {
            expect(CommandsLoader.singleTone).toBe(commandsLoader);
        });

        test("should have empty commands initially", () => {
            expect(commandsLoader.info.size).toBe(0);
        });
    });

    describe("commandsArray getter", () => {
        test("should return empty array when no commands loaded", () => {
            expect(commandsLoader.commandsArray).toEqual([]);
        });

        test("should return command data after loading", async () => {
            // Mock getFiles to return our test commands
            const getFilesMock = mock(() => [
                "e:\\newBot\\src\\commands\\basic\\ping.ts"
            ]);
            
            // Temporarily replace getFiles
            const originalGetFiles = (await import("../../src/utils/file")).getFiles;
            (await import("../../src/utils/file")).getFiles = getFilesMock;

            await commandsLoader.load();
            
            const commandsArray = commandsLoader.commandsArray;
            expect(commandsArray).toHaveLength(1);
            expect(commandsArray[0].name).toBe("ping");

            // Restore original
            (await import("../../src/utils/file")).getFiles = originalGetFiles;
        });
    });

    describe("isValidCommand", () => {
        test("should return false for disabled command", () => {
            const isValid = (commandsLoader as any).isValidCommand(
                "test.ts", 
                mockDisabledCommand
            );
            expect(isValid).toBe(false);
        });

        test("should return false for command without name", () => {
            const invalidCommand = new CommandBuilder();
            invalidCommand.enabled = true;
            // No name set

            const isValid = (commandsLoader as any).isValidCommand(
                "test.ts", 
                invalidCommand
            );
            expect(isValid).toBe(false);
        });

        test("should return false for command without description", () => {
            const invalidCommand = new CommandBuilder();
            invalidCommand.enabled = true;
            invalidCommand.setName("test");
            // No description set

            const isValid = (commandsLoader as any).isValidCommand(
                "test.ts", 
                invalidCommand
            );
            expect(isValid).toBe(false);
        });

        test("should return false for command without runner", () => {
            const invalidCommand = new CommandBuilder()
                .setName("test")
                .setDescription("Test command");
            invalidCommand.enabled = true;
            // No runner set

            const isValid = (commandsLoader as any).isValidCommand(
                "test.ts", 
                invalidCommand
            );
            expect(isValid).toBe(false);
        });

        test("should return true for valid command", () => {
            const isValid = (commandsLoader as any).isValidCommand(
                "test.ts", 
                mockPingCommand
            );
            expect(isValid).toBe(true);
        });
    });

    describe("RegisterCommands", () => {
        test("should register commands to guild", async () => {
            const mockGuild = {
                id: "test-guild-1",
                commands: {
                    set: mock().mockResolvedValue([])
                }
            };

            mockExtendedClient.guilds.fetch.mockResolvedValue(mockGuild);

            await (commandsLoader as any).RegisterCommands("test-guild-1");

            expect(mockExtendedClient.guilds.fetch).toHaveBeenCalledWith("test-guild-1");
            expect(mockGuild.commands.set).toHaveBeenCalled();
        });

        test("should handle guild not found", async () => {
            mockExtendedClient.guilds.fetch.mockRejectedValue(new Error("Guild not found"));

            // Should not throw
            await expect((commandsLoader as any).RegisterCommands("invalid-guild")).resolves.toBeUndefined();
        });
    });

    describe("load", () => {
        test("should load commands from files", async () => {
            // Mock getFiles
            const getFilesMock = mock(() => [
                "e:\\newBot\\src\\commands\\basic\\ping.ts",
                "e:\\newBot\\src\\commands\\basic\\help.ts"
            ]);

            // Replace getFiles temporarily
            const originalGetFiles = require("../../src/utils/file").getFiles;
            require("../../src/utils/file").getFiles = getFilesMock;

            await commandsLoader.load();

            expect(commandsLoader.info.size).toBe(2);
            expect(commandsLoader.info.has("ping")).toBe(true);
            expect(commandsLoader.info.has("help")).toBe(true);

            // Restore
            require("../../src/utils/file").getFiles = originalGetFiles;
        });

        test("should query database for guild commands", async () => {
            await commandsLoader.load();

            expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(
                expect.stringContaining("SELECT guildId, GROUP_CONCAT(CommId)")
            );
        });

        test("should handle empty database result", async () => {
            mockPrisma.$queryRaw.mockResolvedValue([]);

            await commandsLoader.load();

            // Should not throw and should complete successfully
            expect(commandsLoader.info.size).toBe(0);
        });
    });

    describe("reload", () => {
        test("should clear cache and reload commands", async () => {
            const clearCacheSpy = mock();
            (commandsLoader as any).clearCache = clearCacheSpy;

            const result = await commandsLoader.reload();

            expect(clearCacheSpy).toHaveBeenCalled();
            expect(result).toEqual(commandsLoader.commandsArray);
        });
    });

    describe("Integration", () => {
        test("should properly handle guild-specific commands", async () => {
            mockPrisma.$queryRaw.mockResolvedValue([
                {
                    guildId: "guild-1",
                    CommId: "ping"
                },
                {
                    guildId: "guild-2", 
                    CommId: "help"
                }
            ]);

            const getFilesMock = mock(() => [
                "e:\\newBot\\src\\commands\\basic\\ping.ts",
                "e:\\newBot\\src\\commands\\basic\\help.ts"
            ]);

            require("../../src/utils/file").getFiles = getFilesMock;

            await commandsLoader.load();

            // Both commands should be loaded
            expect(commandsLoader.info.size).toBe(2);
            
            // Check internal guild commands mapping
            const guildCommands = (commandsLoader as any).#guildCommands;
            expect(guildCommands.has("guild-1")).toBe(true);
            expect(guildCommands.has("guild-2")).toBe(true);
        });
    });
});