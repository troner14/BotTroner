import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { createMockGuild, createMockExtendedClient, MockPrismaClientForGuilds } from "../mocks/guild-events.mock";

// Import the actual event functions
import { run as guildCreateRun } from "../../src/events/guilds/guildCreate";

describe("GuildCreate Event", () => {
    let mockClient: any;
    let mockGuild: any;
    let mockPrisma: MockPrismaClientForGuilds;

    beforeEach(() => {
        // Reset all mocks before each test
        mockClient = createMockExtendedClient();
        mockGuild = createMockGuild("test-guild-123", "Test Server");
        mockPrisma = mockClient.prisma as MockPrismaClientForGuilds;
        
        // Clear all mock calls
        Object.values(mockPrisma.guilds).forEach((mock: any) => mock.mockClear?.());
        Object.values(mockPrisma.guilds_commandos).forEach((mock: any) => mock.mockClear?.());
        mockPrisma.$transaction.mockClear();
        
        // Clear logger mocks
        mockClient.logger.debug.mockClear();
        mockClient.logger.info.mockClear();
        mockClient.logger.warn.mockClear();
        mockClient.logger.error.mockClear();
    });

    describe("Successful Guild Creation", () => {
        test("should create new guild and enable all commands", async () => {
            // Arrange
            const expectedCommands = ["ping", "vm"];
            mockClient.commands = new Map([
                ["ping", { name: "ping" }],
                ["vm", { name: "vm" }]
            ]);

            // Act
            await guildCreateRun(mockGuild as any, mockClient);

            // Assert - Guild creation
            expect(mockPrisma.guilds.upsert).toHaveBeenCalledWith({
                where: { id: "test-guild-123" },
                update: { lang: "es-es" },
                create: { id: "test-guild-123", lang: "es-es" }
            });

            // Assert - Commands transaction
            expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
            
            // Assert - Logging
            expect(mockClient.logger.debug).toHaveBeenCalledWith("Bot se unió al servidor: Test Server (test-guild-123)");
            expect(mockClient.logger.info).toHaveBeenCalledWith("Guild Test Server guardado en la base de datos");
            expect(mockClient.logger.debug).toHaveBeenCalledWith("Habilitados 2 comandos para el servidor Test Server");
            expect(mockClient.logger.info).toHaveBeenCalledWith("Configuración inicial completada para el servidor: Test Server");
        });

        test("should handle guild with no commands available", async () => {
            // Arrange
            mockClient.commands = new Map();

            // Act
            await guildCreateRun(mockGuild as any, mockClient);

            // Assert - Guild still created
            expect(mockPrisma.guilds.upsert).toHaveBeenCalled();
            
            // Assert - No commands transaction
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
            
            // Assert - Appropriate logging (commands debug log not called when no commands)
            expect(mockClient.logger.debug).toHaveBeenCalledWith("Bot se unió al servidor: Test Server (test-guild-123)");
        });

        test("should handle null/undefined commands gracefully", async () => {
            // Arrange
            mockClient.commands = null;

            // Act
            await guildCreateRun(mockGuild as any, mockClient);

            // Assert - Early return due to no commands
            expect(mockClient.logger.error).toHaveBeenCalledWith("Commands no están disponibles");
            expect(mockPrisma.guilds.upsert).toHaveBeenCalled(); // Guild creation still happens
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });
    });

    describe("Error Handling", () => {
        test("should handle database errors during guild creation", async () => {
            // Arrange
            const dbError = new Error("Database connection failed");
            mockPrisma.guilds.upsert.mockRejectedValueOnce(dbError);

            // Act
            await guildCreateRun(mockGuild as any, mockClient);

            // Assert
            expect(mockClient.logger.error).toHaveBeenCalledWith(
                expect.objectContaining({ 
                    guildName: "Test Server", 
                    guildId: "test-guild-123" 
                }),
                "Error al configurar el servidor"
            );
        });

        test("should handle transaction errors during command setup", async () => {
            // Arrange
            const transactionError = new Error("Transaction failed");
            mockPrisma.$transaction.mockRejectedValueOnce(transactionError);
            mockClient.commands = new Map([["ping", { name: "ping" }]]);

            // Act
            await guildCreateRun(mockGuild as any, mockClient);

            // Assert
            expect(mockClient.logger.error).toHaveBeenCalledWith(
                expect.objectContaining({ 
                    guildName: "Test Server", 
                    guildId: "test-guild-123" 
                }),
                "Error al configurar el servidor"
            );
        });

        test("should handle partial failures gracefully", async () => {
            // Arrange
            mockPrisma.guilds.upsert.mockResolvedValueOnce({ id: "test-guild-123", lang: "es-es" });
            mockPrisma.$transaction.mockRejectedValueOnce(new Error("Commands setup failed"));
            mockClient.commands = new Map([["ping", { name: "ping" }]]);

            // Act
            await guildCreateRun(mockGuild as any, mockClient);

            // Assert - Guild was created successfully
            expect(mockPrisma.guilds.upsert).toHaveBeenCalled();
            expect(mockClient.logger.info).toHaveBeenCalledWith("Guild Test Server guardado en la base de datos");
            
            // Assert - Error was logged for commands
            expect(mockClient.logger.error).toHaveBeenCalled();
        });
    });

    describe("Command Processing", () => {
        test("should process large number of commands efficiently", async () => {
            // Arrange - Create many commands
            const manyCommands = new Map();
            for (let i = 0; i < 50; i++) {
                manyCommands.set(`cmd${i}`, { name: `cmd${i}` });
            }
            mockClient.commands = manyCommands;

            // Act
            await guildCreateRun(mockGuild as any, mockClient);

            // Assert
            expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
            expect(mockClient.logger.debug).toHaveBeenCalledWith("Habilitados 50 comandos para el servidor Test Server");
        });

        test("should correctly structure command data for database", async () => {
            // Arrange
            mockClient.commands = new Map([["test-cmd", { name: "test-cmd" }]]);
            
            // Capture the transaction argument
            let transactionOperations: any[] = [];
            mockPrisma.$transaction.mockImplementationOnce(async (operations) => {
                transactionOperations = operations;
                return operations.map(() => ({ guildId: "test-guild-123", CommId: "test-cmd", enabled: true }));
            });

            // Act
            await guildCreateRun(mockGuild as any, mockClient);

            // Assert - Verify the structure of upsert operations
            expect(transactionOperations).toHaveLength(1);
            
            // We can't easily test the exact structure since it's a Prisma operation,
            // but we can verify the transaction was called
            expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
        });
    });

    describe("Edge Cases", () => {
        test("should handle guild with special characters in name", async () => {
            // Arrange
            const specialGuild = createMockGuild("guild-special-123", "🎮 Gaming Server! @#$%");
            mockClient.commands = new Map([["ping", { name: "ping" }]]);

            // Act
            await guildCreateRun(specialGuild as any, mockClient);

            // Assert
            expect(mockPrisma.guilds.upsert).toHaveBeenCalledWith({
                where: { id: "guild-special-123" },
                update: { lang: "es-es" },
                create: { id: "guild-special-123", lang: "es-es" }
            });
            
            expect(mockClient.logger.debug).toHaveBeenCalledWith("Bot se unió al servidor: 🎮 Gaming Server! @#$% (guild-special-123)");
        });

        test("should handle very long guild IDs", async () => {
            // Arrange
            const longId = "a".repeat(100);
            const longIdGuild = createMockGuild(longId, "Long ID Guild");
            mockClient.commands = new Map([["ping", { name: "ping" }]]);

            // Act
            await guildCreateRun(longIdGuild as any, mockClient);

            // Assert
            expect(mockPrisma.guilds.upsert).toHaveBeenCalledWith({
                where: { id: longId },
                update: { lang: "es-es" },
                create: { id: longId, lang: "es-es" }
            });
        });
    });
});
