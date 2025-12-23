import { test, expect, describe, beforeEach } from "bun:test";
import { createMockGuild, createMockExtendedClient, MockPrismaClientForGuilds } from "../mocks/guild-events.mock";

// Import the actual event function
import { run as guildDeleteRun } from "@src/events/guilds/guildDelete";

describe("GuildDelete Event", () => {
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
        
        // Clear logger mocks
        mockClient.logger.debug.mockClear();
        mockClient.logger.info.mockClear();
        mockClient.logger.warn.mockClear();
        mockClient.logger.error.mockClear();
    });

    describe("Successful Guild Deletion", () => {
        test("should delete guild from database successfully", async () => {
            // Arrange
            mockPrisma.guilds.delete.mockResolvedValueOnce({ 
                id: "test-guild-123", 
                lang: "es-es" 
            });

            // Act
            await guildDeleteRun(mockGuild, mockClient);

            // Assert - Guild deletion
            expect(mockPrisma.guilds.delete).toHaveBeenCalledWith({
                where: { id: "test-guild-123" }
            });

            // Assert - Logging
            expect(mockClient.logger.debug).toHaveBeenCalledWith(
                "Bot fue removido del servidor: Test Server (test-guild-123)"
            );
            expect(mockClient.logger.info).toHaveBeenCalledWith(
                "Guild Test Server eliminado de la base de datos"
            );
        });

        test("should handle cascade deletion (related records automatically deleted)", async () => {
            // Arrange - Prisma cascade should handle related records
            mockPrisma.guilds.delete.mockResolvedValueOnce({ 
                id: "test-guild-123", 
                lang: "es-es" 
            });

            // Act
            await guildDeleteRun(mockGuild, mockClient);

            // Assert - Only guild deletion is called, cascade handles the rest
            expect(mockPrisma.guilds.delete).toHaveBeenCalledTimes(1);
            expect(mockPrisma.guilds_commandos.deleteMany).not.toHaveBeenCalled();
            
            // Assert - Success logging
            expect(mockClient.logger.info).toHaveBeenCalledWith(
                "Guild Test Server eliminado de la base de datos"
            );
        });
    });

    describe("Error Handling", () => {
        test("should handle database errors during guild deletion", async () => {
            // Arrange
            const dbError = new Error("Database connection failed");
            mockPrisma.guilds.delete.mockRejectedValueOnce(dbError);

            // Act
            await guildDeleteRun(mockGuild, mockClient);

            // Assert - Error should be logged
            expect(mockClient.logger.error).toHaveBeenCalledWith(
                dbError,
                "Error al manejar la eliminación del guild Test Server"
            );
        });

        test("should handle record not found errors gracefully", async () => {
            // Arrange
            const notFoundError = new Error("Record to delete does not exist");
            notFoundError.name = "NotFoundError";
            mockPrisma.guilds.delete.mockRejectedValueOnce(notFoundError);

            // Act
            await guildDeleteRun(mockGuild, mockClient);

            // Assert - Error should be logged but not crash
            expect(mockClient.logger.error).toHaveBeenCalledWith(
                notFoundError,
                "Error al manejar la eliminación del guild Test Server"
            );
        });

        test("should handle foreign key constraint errors", async () => {
            // Arrange
            const fkError = new Error("Foreign key constraint failed");
            fkError.name = "ForeignKeyConstraintError";
            mockPrisma.guilds.delete.mockRejectedValueOnce(fkError);

            // Act
            await guildDeleteRun(mockGuild, mockClient);

            // Assert
            expect(mockClient.logger.error).toHaveBeenCalledWith(
                fkError,
                "Error al manejar la eliminación del guild Test Server"
            );
        });

        test("should handle network timeout errors", async () => {
            // Arrange
            const timeoutError = new Error("Request timeout");
            timeoutError.name = "TimeoutError";
            mockPrisma.guilds.delete.mockRejectedValueOnce(timeoutError);

            // Act
            await guildDeleteRun(mockGuild, mockClient);

            // Assert
            expect(mockClient.logger.error).toHaveBeenCalledWith(
                timeoutError,
                "Error al manejar la eliminación del guild Test Server"
            );
            
            // Assert - Debug log still executed
            expect(mockClient.logger.debug).toHaveBeenCalledWith(
                "Bot fue removido del servidor: Test Server (test-guild-123)"
            );
        });
    });

    describe("Edge Cases", () => {
        test("should handle guild with special characters in name", async () => {
            // Arrange
            const specialGuild = createMockGuild("guild-special-123", "🎮 Gaming Server! @#$%") as any;
            mockPrisma.guilds.delete.mockResolvedValueOnce({ 
                id: "guild-special-123", 
                lang: "es-es" 
            });

            // Act
            await guildDeleteRun(specialGuild, mockClient);

            // Assert
            expect(mockPrisma.guilds.delete).toHaveBeenCalledWith({
                where: { id: "guild-special-123" }
            });
            
            expect(mockClient.logger.debug).toHaveBeenCalledWith(
                "Bot fue removido del servidor: 🎮 Gaming Server! @#$% (guild-special-123)"
            );
            expect(mockClient.logger.info).toHaveBeenCalledWith(
                "Guild 🎮 Gaming Server! @#$% eliminado de la base de datos"
            );
        });

        test("should handle very long guild IDs", async () => {
            // Arrange
            const longId = "a".repeat(100);
            const longIdGuild = createMockGuild(longId, "Long ID Guild") as any;
            mockPrisma.guilds.delete.mockResolvedValueOnce({ 
                id: longId, 
                lang: "es-es" 
            });

            // Act
            await guildDeleteRun(longIdGuild, mockClient);

            // Assert
            expect(mockPrisma.guilds.delete).toHaveBeenCalledWith({
                where: { id: longId }
            });
        });

        test("should handle null/undefined guild name", async () => {
            // Arrange
            const nullNameGuild = { ...mockGuild, name: null };
            mockPrisma.guilds.delete.mockResolvedValueOnce({ 
                id: "test-guild-123", 
                lang: "es-es" 
            });

            // Act
            await guildDeleteRun(nullNameGuild, mockClient);

            // Assert - Should still work with null name
            expect(mockPrisma.guilds.delete).toHaveBeenCalled();
            expect(mockClient.logger.debug).toHaveBeenCalledWith(
                "Bot fue removido del servidor: null (test-guild-123)"
            );
        });

        test("should handle empty guild ID", async () => {
            // Arrange
            const emptyIdGuild = createMockGuild("", "Empty ID Guild") as any;
            mockPrisma.guilds.delete.mockResolvedValueOnce({ 
                id: "", 
                lang: "es-es" 
            });

            // Act
            await guildDeleteRun(emptyIdGuild, mockClient);

            // Assert
            expect(mockPrisma.guilds.delete).toHaveBeenCalledWith({
                where: { id: "" }
            });
        });
    });

    describe("Performance Considerations", () => {
        test("should complete deletion quickly", async () => {
            // Arrange
            const startTime = Date.now();
            mockPrisma.guilds.delete.mockResolvedValueOnce({ 
                id: "test-guild-123", 
                lang: "es-es" 
            });

            // Act
            await guildDeleteRun(mockGuild, mockClient);
            const endTime = Date.now();

            // Assert - Should complete quickly (within reasonable time for a test)
            expect(endTime - startTime).toBeLessThan(100); // 100ms should be more than enough for a mock
            expect(mockPrisma.guilds.delete).toHaveBeenCalledTimes(1);
        });

        test("should not perform unnecessary database operations", async () => {
            // Arrange
            mockPrisma.guilds.delete.mockResolvedValueOnce({ 
                id: "test-guild-123", 
                lang: "es-es" 
            });

            // Act
            await guildDeleteRun(mockGuild, mockClient);

            // Assert - Only one delete operation should be performed
            expect(mockPrisma.guilds.delete).toHaveBeenCalledTimes(1);
            expect(mockPrisma.guilds.findUnique).not.toHaveBeenCalled();
            expect(mockPrisma.guilds.findMany).not.toHaveBeenCalled();
            expect(mockPrisma.guilds_commandos.deleteMany).not.toHaveBeenCalled();
        });
    });
});