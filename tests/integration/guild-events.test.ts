import { test, expect, describe, beforeEach } from "bun:test";
import { createMockGuild, createMockExtendedClient, MockPrismaClientForGuilds } from "../mocks/guild-events.mock";

// Import both event functions
import { run as guildCreateRun } from "../../src/events/guilds/guildCreate";
import { run as guildDeleteRun } from "../../src/events/guilds/GuildDelete";

describe("Guild Events Integration Tests", () => {
    let mockClient: any;
    let mockGuild: any;
    let mockPrisma: MockPrismaClientForGuilds;

    beforeEach(() => {
        // Reset all mocks before each test
        mockClient = createMockExtendedClient();
        mockGuild = createMockGuild("integration-guild-123", "Integration Test Server");
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

    describe("Complete Guild Lifecycle", () => {
        test("should handle full guild join -> leave cycle", async () => {
            // Arrange
            mockClient.commands = new Map([
                ["ping", { name: "ping" }],
                ["vm", { name: "vm" }]
            ]);

            // Act 1: Guild joins
            await guildCreateRun(mockGuild as any, mockClient);

            // Assert: Guild creation completed
            expect(mockPrisma.guilds.upsert).toHaveBeenCalledWith({
                where: { id: "integration-guild-123" },
                update: { lang: "es-es" },
                create: { id: "integration-guild-123", lang: "es-es" }
            });
            expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

            // Clear mocks for second phase
            Object.values(mockPrisma.guilds).forEach((mock: any) => mock.mockClear?.());
            mockPrisma.guilds.delete.mockResolvedValueOnce({ 
                id: "integration-guild-123", 
                lang: "es-es" 
            });

            // Act 2: Guild leaves
            await guildDeleteRun(mockGuild as any, mockClient);

            // Assert: Guild deletion completed
            expect(mockPrisma.guilds.delete).toHaveBeenCalledWith({
                where: { id: "integration-guild-123" }
            });

            // Assert: Both events logged properly
            expect(mockClient.logger.info).toHaveBeenCalledWith(
                "Guild Integration Test Server eliminado de la base de datos"
            );
        });

        test("should handle multiple guilds with different command sets", async () => {
            // Arrange
            const guild1 = createMockGuild("guild-1", "Server 1") as any;
            const guild2 = createMockGuild("guild-2", "Server 2") as any;
            
            // Different command sets for testing
            const commands1 = new Map([["ping", { name: "ping" }]]);
            const commands2 = new Map([["ping", { name: "ping" }], ["vm", { name: "vm" }]]);

            // Act: Guild 1 joins with 1 command
            mockClient.commands = commands1;
            await guildCreateRun(guild1 as any, mockClient);

            // Clear and setup for guild 2
            mockPrisma.$transaction.mockClear();
            mockClient.commands = commands2;
            await guildCreateRun(guild2 as any, mockClient);

            // Assert: Second guild processed (transaction called once after clear)
            expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
            expect(mockPrisma.guilds.upsert).toHaveBeenCalledTimes(2);

            // Act: Both guilds leave
            mockPrisma.guilds.delete.mockResolvedValue({ id: "any", lang: "es-es" });
            await guildDeleteRun(guild1, mockClient);
            await guildDeleteRun(guild2, mockClient);

            // Assert: Both deletions processed
            expect(mockPrisma.guilds.delete).toHaveBeenCalledTimes(2);
        });
    });

    describe("Error Recovery Scenarios", () => {
        test("should handle partial failures during guild creation then successful deletion", async () => {
            // Arrange
            mockClient.commands = new Map([["ping", { name: "ping" }]]);
            
            // Setup: Guild creation succeeds, but commands fail
            mockPrisma.guilds.upsert.mockResolvedValueOnce({ id: "integration-guild-123", lang: "es-es" });
            mockPrisma.$transaction.mockRejectedValueOnce(new Error("Commands setup failed"));

            // Act 1: Guild creation with partial failure
            await guildCreateRun(mockGuild as any, mockClient);

            // Assert: Guild was created but commands failed
            expect(mockPrisma.guilds.upsert).toHaveBeenCalled();
            expect(mockClient.logger.error).toHaveBeenCalled();

            // Setup for deletion
            mockPrisma.guilds.delete.mockResolvedValueOnce({ id: "integration-guild-123", lang: "es-es" });

            // Act 2: Guild deletion should still work
            await guildDeleteRun(mockGuild as any, mockClient);

            // Assert: Deletion succeeded despite earlier command setup failure
            expect(mockPrisma.guilds.delete).toHaveBeenCalledWith({
                where: { id: "integration-guild-123" }
            });
        });

        test("should handle database inconsistencies gracefully", async () => {
            // Arrange
            mockClient.commands = new Map([["ping", { name: "ping" }]]);

            // Setup: Simulate database inconsistency where guild exists but commands don't
            mockPrisma.guilds.upsert.mockResolvedValueOnce({ id: "integration-guild-123", lang: "es-es" });
            mockPrisma.$transaction.mockResolvedValueOnce([]);

            // Act 1: Create guild (commands might already exist)
            await guildCreateRun(mockGuild as any, mockClient);

            // Setup: Delete fails due to foreign key constraints
            const fkError = new Error("Foreign key constraint failed");
            mockPrisma.guilds.delete.mockRejectedValueOnce(fkError);

            // Act 2: Try to delete guild
            await guildDeleteRun(mockGuild as any, mockClient);

            // Assert: Error was handled gracefully
            expect(mockClient.logger.error).toHaveBeenCalledWith(
                fkError,
                "Error al manejar la eliminación del guild Integration Test Server"
            );
        });
    });

    describe("Concurrency and Race Conditions", () => {
        test("should handle rapid guild join/leave scenarios", async () => {
            // Arrange
            mockClient.commands = new Map([["ping", { name: "ping" }]]);
            const guilds = [
                createMockGuild("rapid-1", "Rapid 1") as any,
                createMockGuild("rapid-2", "Rapid 2") as any,
                createMockGuild("rapid-3", "Rapid 3") as any
            ];

            // Setup mocks for rapid operations
            mockPrisma.guilds.upsert.mockResolvedValue({ id: "any", lang: "es-es" });
            mockPrisma.guilds.delete.mockResolvedValue({ id: "any", lang: "es-es" });

            // Act: Rapid join operations
            const joinPromises = guilds.map(guild => guildCreateRun(guild as any, mockClient));
            await Promise.all(joinPromises);

            // Assert: All joins processed
            expect(mockPrisma.guilds.upsert).toHaveBeenCalledTimes(3);

            // Act: Rapid leave operations
            const leavePromises = guilds.map(guild => guildDeleteRun(guild, mockClient));
            await Promise.all(leavePromises);

            // Assert: All leaves processed
            expect(mockPrisma.guilds.delete).toHaveBeenCalledTimes(3);
        });

        test("should handle mixed success/failure scenarios", async () => {
            // Arrange
            mockClient.commands = new Map([["ping", { name: "ping" }]]);
            const successGuild = createMockGuild("success-guild", "Success Guild") as any;
            const failGuild = createMockGuild("fail-guild", "Fail Guild") as any;

            // Setup: One succeeds, one fails
            mockPrisma.guilds.upsert
                .mockResolvedValueOnce({ id: "success-guild", lang: "es-es" })
                .mockRejectedValueOnce(new Error("Database error"));

            // Act: Process both guilds simultaneously
            const promises = [
                guildCreateRun(successGuild as any, mockClient),
                guildCreateRun(failGuild as any, mockClient)
            ];
            
            await Promise.all(promises);

            // Assert: Both operations processed (may have different success/failure combinations)
            expect(mockPrisma.guilds.upsert).toHaveBeenCalledTimes(2);
            expect(mockClient.logger.error).toHaveBeenCalled(); // At least one error expected
            // Note: Success/failure ratio may vary based on which operation fails first
        });
    });

    describe("Data Consistency Validation", () => {
        test("should maintain referential integrity between guilds and commands", async () => {
            // Arrange
            const testGuild = createMockGuild("consistency-test", "Consistency Test") as any;
            mockClient.commands = new Map([
                ["cmd1", { name: "cmd1" }],
                ["cmd2", { name: "cmd2" }]
            ]);

            // Track what data should be created
            let transactionCalls: any[] = [];
            mockPrisma.$transaction.mockImplementationOnce(async (operations) => {
                transactionCalls = operations;
                return operations.map(() => ({ success: true }));
            });

            // Act: Create guild with commands
            await guildCreateRun(testGuild as any, mockClient);

            // Assert: Transaction was called with correct structure
            expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
            expect(transactionCalls).toHaveLength(2); // One for each command

            // Setup deletion
            mockPrisma.guilds.delete.mockResolvedValueOnce({ id: "consistency-test", lang: "es-es" });

            // Act: Delete guild (should cascade to commands)
            await guildDeleteRun(testGuild, mockClient);

            // Assert: Only guild deletion called (cascade handles commands)
            expect(mockPrisma.guilds.delete).toHaveBeenCalledWith({
                where: { id: "consistency-test" }
            });
        });

        test("should validate guild data completeness", async () => {
            // Arrange
            const incompleteGuild = { id: "incomplete-123" } as any; // Missing name
            mockClient.commands = new Map([["ping", { name: "ping" }]]);

            // Act: Process incomplete guild
            await guildCreateRun(incompleteGuild as any, mockClient);

            // Assert: Should still process with available data
            expect(mockPrisma.guilds.upsert).toHaveBeenCalledWith({
                where: { id: "incomplete-123" },
                update: { lang: "es-es" },
                create: { id: "incomplete-123", lang: "es-es" }
            });
        });
    });
});
