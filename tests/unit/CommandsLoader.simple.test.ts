import { test, expect, describe, beforeEach, mock } from "bun:test";
import { CommandsLoader } from "../../src/class/loaders/Commands";
import { MockClient } from "../mocks/discord.mock";
import { mockPrisma } from "../mocks/prisma.mock";
import { CommandBuilder } from "../../src/class/CommandBuilder";

const mockExtendedClient = {
    prisma: mockPrisma,
    guilds: new MockClient().guilds
} as any;

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

        test("should have empty commands initially", () => {
            expect(commandsLoader.info.size).toBe(0);
        });
    });

    describe("commandsArray getter", () => {
        test("should return empty array when no commands loaded", () => {
            expect(commandsLoader.commandsArray).toEqual([]);
        });
    });

    describe("isValidCommand", () => {
        test("should return false for disabled command", () => {
            const disabledCommand = new CommandBuilder()
                .setName("disabled")
                .setDescription("Disabled command");
            disabledCommand.enabled = false;

            const isValid = (commandsLoader as any).isValidCommand(
                "test.ts", 
                disabledCommand
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
            const validCommand = new CommandBuilder()
                .setName("valid")
                .setDescription("Valid command");
            validCommand.enabled = true;
            validCommand.runner = mock(async () => {});

            const isValid = (commandsLoader as any).isValidCommand(
                "test.ts", 
                validCommand
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

    describe("reload", () => {
        test("should clear cache and reload commands", async () => {
            const clearCacheSpy = mock();
            (commandsLoader as any).clearCache = clearCacheSpy;

            const result = await commandsLoader.reload();

            expect(clearCacheSpy).toHaveBeenCalled();
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe("Database integration", () => {
        test("should query database for guild commands on load", async () => {
            // Mock getFiles to return empty array to avoid import issues
            const originalGetFiles = require("@utils/file").getFiles;
            require("@utils/file").getFiles = mock(() => []);

            try {
                await commandsLoader.load();
                expect(mockPrisma.$queryRaw).toHaveBeenCalled();
            } finally {
                // Restore original function
                require("@utils/file").getFiles = originalGetFiles;
            }
        });

        test("should handle empty database result", async () => {
            mockPrisma.$queryRaw.mockResolvedValue([]);
            
            const originalGetFiles = require("@utils/file").getFiles;
            require("@utils/file").getFiles = mock(() => []);

            try {
                await commandsLoader.load();
                expect(commandsLoader.info.size).toBe(0);
            } finally {
                require("@utils/file").getFiles = originalGetFiles;
            }
        });
    });
});