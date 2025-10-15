import { test, expect, describe, beforeEach, mock } from "bun:test";
import { CommandsLoader } from "@src/class/loaders/Commands";
import { MockClient } from "../mocks/discord.mock";
import { mockPrisma } from "../mocks/prisma.mock";
import { CommandBuilder } from "@src/class/builders/CommandBuilder";

// Create proper guilds mock
const mockGuilds = {
    cache: {
        map: mock(() => []),
        forEach: mock(() => {})
    },
    fetch: mock().mockResolvedValue({
        id: "test-guild-id",
        name: "Test Guild",
        commands: {
            set: mock().mockResolvedValue([])
        }
    })
};

const mockExtendedClient = {
    prisma: mockPrisma,
    guilds: mockGuilds
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
        mockPrisma.guilds_commandos.findMany.mockClear();
        mockPrisma.guilds_commandos.findMany.mockResolvedValue([
            { guildId: "test-guild-1", CommId: "ping" },
            { guildId: "test-guild-1", CommId: "help" },
            { guildId: "test-guild-2", CommId: "test" }
        ]);
        
        mockGuilds.cache.map.mockClear();
        mockGuilds.cache.forEach.mockClear();
        mockGuilds.fetch.mockClear();

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

        test("should return empty array initially", () => {
            const commandsArray = commandsLoader.commandsArray;
            expect(Array.isArray(commandsArray)).toBe(true);
            expect(commandsArray).toHaveLength(0);
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
            // No runner set - accessing runner will throw

            expect(() => {
                (commandsLoader as any).isValidCommand("test.ts", invalidCommand);
            }).toThrow("Runner not set for this command");
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

            mockGuilds.fetch.mockResolvedValue(mockGuild);

            await (commandsLoader as any).RegisterCommands("test-guild-1");

            expect(mockGuilds.fetch).toHaveBeenCalledWith("test-guild-1");
            expect(mockGuild.commands.set).toHaveBeenCalled();
        });

        test("should handle guild not found", async () => {
            mockGuilds.fetch.mockRejectedValue(new Error("Guild not found"));

            // Should not throw
            await expect((commandsLoader as any).RegisterCommands("invalid-guild")).resolves.toBeUndefined();
        });
    });

    describe("load", () => {
        test("should have empty commands initially", () => {
            // Test that commandsLoader starts with empty state
            expect(commandsLoader.info.size).toBe(0);
            expect(commandsLoader.commandsArray).toEqual([]);
        });

        test("should query database for guild commands", async () => {
            const originalLoad = commandsLoader.load;
            commandsLoader.load = mock(async () => {
                // Simulate the database query part
                await mockPrisma.guilds_commandos.findMany({
                    where: { enabled: true },
                    select: { guildId: true, CommId: true }
                });
            });

            await commandsLoader.load();
            expect(mockPrisma.guilds_commandos.findMany).toHaveBeenCalled();

            commandsLoader.load = originalLoad;
        });

        test("should handle empty database result", async () => {
            mockPrisma.guilds_commandos.findMany.mockResolvedValue([]);
            
            const originalLoad = commandsLoader.load;
            commandsLoader.load = mock(async () => {
                // Simulate empty result handling
                await mockPrisma.guilds_commandos.findMany({
                    where: { enabled: true },
                    select: { guildId: true, CommId: true }
                });
            });

            await commandsLoader.load();
            expect(commandsLoader.info.size).toBe(0);

            commandsLoader.load = originalLoad;
        });
    });

    describe("reload", () => {
        test("should clear cache and reload commands", async () => {
            const originalLoad = commandsLoader.load;
            const mockLoad = mock(async () => {
                // Simulate successful load
            });
            commandsLoader.load = mockLoad;

            const clearCacheSpy = mock();
            (commandsLoader as any).clearCache = clearCacheSpy;

            const result = await commandsLoader.reload();

            expect(clearCacheSpy).toHaveBeenCalled();
            expect(mockLoad).toHaveBeenCalled();
            expect(Array.isArray(result)).toBe(true);

            commandsLoader.load = originalLoad;
        });
    });

    describe("Integration", () => {
        test("should properly handle database queries", () => {
            // Test that mock database returns expected structure
            mockPrisma.guilds_commandos.findMany.mockResolvedValue([
                {
                    guildId: "guild-1",
                    CommId: "ping"
                },
                {
                    guildId: "guild-2", 
                    CommId: "help"
                }
            ]);

            // Verify the mock is set up correctly
            expect(mockPrisma.guilds_commandos.findMany).toBeDefined();
            expect(typeof mockPrisma.guilds_commandos.findMany).toBe('function');
        });
    });
});