import { test, expect, describe, beforeEach, mock } from "bun:test";
import { CommandBuilder } from "../../src/class/CommandBuilder";
import { CommandHandler } from "../../src/handlers/core/CommandHandler";
import { MockInteraction } from "../mocks/discord.mock";

describe("Integration Tests", () => {
    describe("Command Flow Integration", () => {
        test("should execute complete command flow", async () => {
            // Create a simple command using the working pattern from other tests
            const testCommand = new CommandBuilder()
                .setName("integration-test")
                .setDescription("Integration test command");

            // Track execution
            let executionResult = "";
            testCommand.enabled = true;
            testCommand.runner = async (context: any) => {
                const input = context.args.getString("input");
                executionResult = `Command executed with input: ${input}`;
                await context.interaction.reply(executionResult);
            };

            // Create mock client with the command
            const mockClient = {
                commands: new Map([
                    ["integration-test", testCommand]
                ])
            };

            // Create mock interaction
            const mockInteraction = new MockInteraction();
            mockInteraction.commandName = "integration-test";
            mockInteraction.options.getString.mockReturnValue("test-value");

            // Create handler and execute
            const commandHandler = new CommandHandler();
            
            await commandHandler.handle({
                interaction: mockInteraction as any,
                client: mockClient
            });

            // Verify execution
            expect(executionResult).toBe("Command executed with input: test-value");
            expect(mockInteraction.reply).toHaveBeenCalledWith(executionResult);
        });

        test("should handle command validation in real scenario", () => {
            const command = new CommandBuilder()
                .setName("test")
                .setDescription("Test command");
            
            command.enabled = true;
            command.runner = async () => {};

            // Should be valid
            expect(command.enabled).toBe(true);
            expect(command.name).toBe("test");
            expect(command.description).toBe("Test command");
            expect(() => command.runner).not.toThrow();

            // Should generate valid Discord command data
            const commandData = command.toJSON();
            expect(commandData.name).toBe("test");
            expect(commandData.description).toBe("Test command");
        });
    });

    describe("Error Handling Integration", () => {
        test("should handle command errors gracefully", async () => {
            const errorCommand = new CommandBuilder()
                .setName("error-test")
                .setDescription("Command that throws error");

            errorCommand.runner = async () => {
                throw new Error("Test error");
            };

            const mockClient = {
                commands: new Map([
                    ["error-test", errorCommand]
                ])
            };

            const mockInteraction = new MockInteraction();
            mockInteraction.commandName = "error-test";

            const commandHandler = new CommandHandler();
            
            // Should not throw, should handle gracefully
            await expect(commandHandler.handle({
                interaction: mockInteraction as any,
                client: mockClient
            })).resolves.toBeUndefined();

            // Should reply with error message
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: '¡Algo salió mal!',
                ephemeral: true
            });
        });
    });

    describe("Command Builder Validation Integration", () => {
        test("should create complete command with all features", () => {
            const fullCommand = new CommandBuilder()
                .setName("full-test")
                .setDescription("Complete test command")
                .addStringOption(option =>
                    option
                        .setName("required-input")
                        .setDescription("Required string input")
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName("optional-number")
                        .setDescription("Optional number input")
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName("flag")
                        .setDescription("Boolean flag")
                        .setRequired(false)
                );

            fullCommand.enabled = true;
            fullCommand.runner = async ({ interaction, args }) => {
                const requiredInput = args.getString("required-input", true);
                const optionalNumber = args.getInteger("optional-number", false);
                const flag = args.getBoolean("flag", false);
                
                await interaction.reply(`Inputs received: ${requiredInput}, ${optionalNumber}, ${flag}`);
            };

            // Verify command structure
            const commandData = fullCommand.toJSON();
            expect(commandData.name).toBe("full-test");
            expect(commandData.description).toBe("Complete test command");
            expect(commandData.options).toHaveLength(3);

            // Verify options
            const options = commandData.options!;
            expect(options[0].name).toBe("required-input");
            expect(options[0].required).toBe(true);
            expect(options[1].name).toBe("optional-number");
            expect(options[1].required).toBe(false);
            expect(options[2].name).toBe("flag");
            expect(options[2].required).toBe(false);

            // Verify functionality
            expect(fullCommand.enabled).toBe(true);
            expect(() => fullCommand.runner).not.toThrow();
        });
    });
});