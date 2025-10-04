import { test, expect, describe, beforeEach } from "bun:test";
import { CommandBuilder } from "../../src/class/CommandBuilder";
import type { ChatInputCommandInteraction, AutocompleteInteraction } from "discord.js";

describe("CommandBuilder", () => {
    let commandBuilder: CommandBuilder;

    beforeEach(() => {
        commandBuilder = new CommandBuilder();
    });

    describe("Constructor", () => {
        test("should create a new CommandBuilder instance", () => {
            expect(commandBuilder).toBeInstanceOf(CommandBuilder);
        });

        test("should be enabled by default", () => {
            expect(commandBuilder.enabled).toBe(true);
        });

        test("should inherit from SlashCommandBuilder", () => {
            expect(commandBuilder.toJSON).toBeDefined();
            expect(commandBuilder.setName).toBeDefined();
            expect(commandBuilder.setDescription).toBeDefined();
        });
    });

    describe("enabled property", () => {
        test("should set and get enabled state", () => {
            commandBuilder.enabled = false;
            expect(commandBuilder.enabled).toBe(false);

            commandBuilder.enabled = true;
            expect(commandBuilder.enabled).toBe(true);
        });
    });

    describe("runner property", () => {
        test("should set and get runner function", () => {
            const mockRunner = async (interaction: ChatInputCommandInteraction) => {
                await interaction.reply("Test");
            };

            commandBuilder.runner = mockRunner;
            expect(commandBuilder.runner).toBe(mockRunner);
        });

        test("should throw error when getting runner that was never set", () => {
            expect(() => commandBuilder.runner).toThrow("Runner not set for this command");
        });

        test("should not throw when runner is set", () => {
            const mockRunner = async (interaction: ChatInputCommandInteraction) => {
                await interaction.reply("Test");
            };

            commandBuilder.runner = mockRunner;
            expect(() => commandBuilder.runner).not.toThrow();
        });
    });

    describe("autocomplete property", () => {
        test("should set and get autocomplete function", () => {
            const mockAutocomplete = async (interaction: AutocompleteInteraction) => {
                await interaction.respond([]);
            };

            commandBuilder.autocomplete = mockAutocomplete;
            expect(commandBuilder.autocomplete).toBe(mockAutocomplete);
        });

        test("should throw error when getting autocomplete that was never set", () => {
            expect(() => commandBuilder.autocomplete).toThrow("Autocomplete not set for this command");
        });

        test("should not throw when autocomplete is set", () => {
            const mockAutocomplete = async (interaction: AutocompleteInteraction) => {
                await interaction.respond([]);
            };

            commandBuilder.autocomplete = mockAutocomplete;
            expect(() => commandBuilder.autocomplete).not.toThrow();
        });
    });

    describe("Integration with SlashCommandBuilder", () => {
        test("should build valid command data", () => {
            const mockRunner = async (interaction: ChatInputCommandInteraction) => {
                await interaction.reply("Test");
            };

            commandBuilder
                .setName("test-command")
                .setDescription("A test command");
            commandBuilder.runner = mockRunner;

            const commandData = commandBuilder.toJSON();
            
            expect(commandData.name).toBe("test-command");
            expect(commandData.description).toBe("A test command");
            expect(commandData.type).toBe(1); // CHAT_INPUT
        });

        test("should support command options", () => {
            commandBuilder
                .setName("test-command")
                .setDescription("A test command")
                .addStringOption(option =>
                    option
                        .setName("input")
                        .setDescription("Test input")
                        .setRequired(true)
                );

            const commandData = commandBuilder.toJSON();
            
            expect(commandData.options).toHaveLength(1);
            expect(commandData.options![0].name).toBe("input");
            expect(commandData.options![0].description).toBe("Test input");
            expect(commandData.options![0].required).toBe(true);
        });
    });

    describe("Complete command example", () => {
        test("should create a fully functional command", () => {
            const mockRunner = async (interaction: ChatInputCommandInteraction) => {
                const input = interaction.options.getString("input");
                await interaction.reply(`Hello ${input}!`);
            };

            const mockAutocomplete = async (interaction: AutocompleteInteraction) => {
                const focusedValue = interaction.options.getFocused();
                const choices = ["world", "universe", "everyone"]
                    .filter(choice => choice.startsWith(focusedValue));
                
                await interaction.respond(
                    choices.map(choice => ({ name: choice, value: choice }))
                );
            };

            commandBuilder
                .setName("hello")
                .setDescription("Say hello to someone")
                .addStringOption(option =>
                    option
                        .setName("input")
                        .setDescription("Who to greet")
                        .setRequired(true)
                        .setAutocomplete(true)
                );

            commandBuilder.runner = mockRunner;
            commandBuilder.autocomplete = mockAutocomplete;

            // Verify the command is properly configured
            expect(commandBuilder.enabled).toBe(true);
            expect(commandBuilder.runner).toBe(mockRunner);
            expect(commandBuilder.autocomplete).toBe(mockAutocomplete);
            
            const commandData = commandBuilder.toJSON();
            expect(commandData.name).toBe("hello");
            expect(commandData.description).toBe("Say hello to someone");
        });
    });
});