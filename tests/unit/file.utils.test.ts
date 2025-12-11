import { test, expect, describe, beforeEach, mock } from "bun:test";
import fs from "fs";
import { folderExist, getFiles } from "@src/utils/file";

// Mock fs module
const mockFs = {
    existsSync: mock(),
    readdirSync: mock(),
    statSync: mock()
};

describe("File Utils", () => {
    beforeEach(() => {
        // Reset mocks
        mockFs.existsSync.mockClear();
        mockFs.readdirSync.mockClear();
        mockFs.statSync.mockClear();
    });

    describe("folderExist", () => {
        test("should return true when folder exists", () => {
            mockFs.existsSync.mockReturnValue(true);
            // Mock fs.existsSync
            const originalExistsSync = fs.existsSync;
            fs.existsSync = mockFs.existsSync;

            const result = folderExist("commands");
            
            expect(result).toBe(true);
            expect(mockFs.existsSync).toHaveBeenCalledWith("./src/commands/");

            // Restore
            fs.existsSync = originalExistsSync;
        });

        test("should return false when folder doesn't exist", () => {
            mockFs.existsSync.mockReturnValue(false);
            const originalExistsSync = fs.existsSync;
            fs.existsSync = mockFs.existsSync;

            const result = folderExist("nonexistent");
            
            expect(result).toBe(false);
            expect(mockFs.existsSync).toHaveBeenCalledWith("./src/nonexistent/");

            fs.existsSync = originalExistsSync;
        });
    });

    describe("getFiles", () => {
        test("should throw error when folder doesn't exist", () => {
            mockFs.existsSync.mockReturnValue(false);
            const originalExistsSync = fs.existsSync;
            fs.existsSync = mockFs.existsSync;

            expect(() => getFiles("nonexistent" as any)).toThrow("Folder nonexistent does not exist");

            fs.existsSync = originalExistsSync;
        });

        test("should return files from folder", () => {
            // Mock folder exists
            mockFs.existsSync.mockReturnValue(true);
            
            // Mock folder contents
            mockFs.readdirSync.mockReturnValue(["file1.ts", "file2.ts"]);
            
            // Mock file stats
            mockFs.statSync.mockReturnValue({ isFile: () => true, isDirectory: () => false });

            // Replace fs methods
            const originalExistsSync = fs.existsSync;
            const originalReaddirSync = fs.readdirSync;
            const originalStatSync = fs.statSync;
            
            fs.existsSync = mockFs.existsSync;
            fs.readdirSync = mockFs.readdirSync;
            (fs as any).statSync = mockFs.statSync;

            const result = getFiles("commands");
            
            expect(result).toEqual(["@src/commands/file1.ts", "@src/commands/file2.ts"]);
            expect(mockFs.readdirSync).toHaveBeenCalledWith("./src/commands/");

            // Restore
            fs.existsSync = originalExistsSync;
            fs.readdirSync = originalReaddirSync;
            (fs as any).statSync = originalStatSync;
        });

        test("should handle directories recursively", () => {
            // Mock folder exists
            mockFs.existsSync.mockReturnValue(true);
            
            // Mock folder contents - mix of files and directories
            mockFs.readdirSync
                .mockReturnValueOnce(["file1.ts", "subfolder"])
                .mockReturnValueOnce(["file2.ts"]); // subfolder contents
            
            // Mock file stats
            mockFs.statSync
                .mockReturnValueOnce({ isFile: () => true, isDirectory: () => false })  // file1.ts
                .mockReturnValueOnce({ isFile: () => false, isDirectory: () => true }) // subfolder
                .mockReturnValueOnce({ isFile: () => true, isDirectory: () => false }); // file2.ts

            const originalExistsSync = fs.existsSync;
            const originalReaddirSync = fs.readdirSync;
            const originalStatSync = fs.statSync;
            
            fs.existsSync = mockFs.existsSync;
            fs.readdirSync = mockFs.readdirSync;
            (fs as any).statSync = mockFs.statSync;

            const result = getFiles("commands");
            
            expect(result).toContain("@src/commands/file1.ts");
            expect(result).toContain("@src/commands/subfolder/file2.ts");

            // Restore
            fs.existsSync = originalExistsSync;
            fs.readdirSync = originalReaddirSync;
            (fs as any).statSync = originalStatSync;
        });

        test("should respect recursive parameter", () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readdirSync.mockReturnValue(["file1.ts", "subfolder"]);
            mockFs.statSync
                .mockReturnValueOnce({ isFile: () => true, isDirectory: () => false })
                .mockReturnValueOnce({ isFile: () => false, isDirectory: () => true });

            const originalExistsSync = fs.existsSync;
            const originalReaddirSync = fs.readdirSync;
            const originalStatSync = fs.statSync;
            
            fs.existsSync = mockFs.existsSync;
            fs.readdirSync = mockFs.readdirSync;
            (fs as any).statSync = mockFs.statSync;

            const result = getFiles("commands", false);
            
            // Should only include direct files, not subdirectory contents
            expect(result).toEqual(["@src/commands/file1.ts"]);

            // Restore
            fs.existsSync = originalExistsSync;
            fs.readdirSync = originalReaddirSync;
            (fs as any).statSync = originalStatSync;
        });
    });
});