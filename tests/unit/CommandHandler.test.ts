import { test, expect, describe, beforeEach, mock } from "bun:test";
import { CommandHandler } from "../../src/handlers/core/CommandHandler";
import { MockInteraction } from "../mocks/discord.mock";
import { CommandBuilder } from "../../src/class/builders/CommandBuilder";

describe("CommandHandler", () => {
    let commandHandler: CommandHandler;
    let mockInteraction: MockInteraction;
    let mockClient: any;
    let mockCommand: CommandBuilder;

    beforeEach(() => {
        commandHandler = new CommandHandler();
        mockInteraction = new MockInteraction();
        
        // Create a mock command
        mockCommand = new CommandBuilder()
            .setName("test-command")
            .setDescription("Test command");
        mockCommand.enabled = true;
        mockCommand.runner = mock(async ({ interaction }) => {
            await interaction.reply("Command executed!");
        });

        // Create mock client with commands
        mockClient = {
            commands: new Map([
                ["test-command", mockCommand]
            ])
        };

        // Reset mocks
        mockInteraction.reply.mockClear();
        mockInteraction.followUp.mockClear();
        mockInteraction.deferReply.mockClear();
    });

    describe("Constructor", () => {
        test("should create CommandHandler instance", () => {
            expect(commandHandler).toBeInstanceOf(CommandHandler);
        });
    });

    describe("handle method", () => {
        test("should execute command when it exists", async () => {
            const context = {
                interaction: mockInteraction as any,
                client: mockClient
            };

            await commandHandler.handle(context);

            expect(mockCommand.runner).toHaveBeenCalledWith({
                interaction: mockInteraction,
                client: mockClient,
                args: mockInteraction.options
            });
        });

        test("should reply with error when command doesn't exist", async () => {
            mockInteraction.commandName = "nonexistent-command";
            
            const context = {
                interaction: mockInteraction as any,
                client: mockClient
            };

            await commandHandler.handle(context);

            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: "El comando no existe o tiene un error.",
                ephemeral: true
            });
        });

        test("should handle command execution errors", async () => {
            // Make the command throw an error
            mockCommand.runner = mock(async () => {
                throw new Error("Test error");
            });

            const context = {
                interaction: mockInteraction as any,
                client: mockClient
            };

            await commandHandler.handle(context);

            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: '¡Algo salió mal!',
                ephemeral: true
            });
        });

        test("should handle missing commands map", async () => {
            const clientWithoutCommands = {
                commands: undefined
            };

            const context = {
                interaction: mockInteraction as any,
                client: clientWithoutCommands
            };

            await commandHandler.handle(context);

            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: "El comando no existe o tiene un error.",
                ephemeral: true
            });
        });

        test("should pass correct arguments to command runner", async () => {
            const mockOptions = { getString: mock() };
            (mockInteraction as any).options = mockOptions;

            const context = {
                interaction: mockInteraction as any,
                client: mockClient
            };

            await commandHandler.handle(context);

            expect(mockCommand.runner).toHaveBeenCalledWith({
                interaction: mockInteraction,
                client: mockClient,
                args: mockOptions
            });
        });
    });
});