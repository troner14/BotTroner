import fs from "fs";
import type {AllFolders} from "@dTypes/fileUtils";

export const folderExist = (folderName: string): boolean => {
    const exists = fs.existsSync(`./src/${folderName}/`);

    return exists;
}

export const getFiles = (folderName: AllFolders, recursive = true): string[] => {
    if (!folderExist(folderName)) {
        throw new Error(`Folder ${folderName} does not exist`);
    }
    let allFiles: string[] = [];
    const folder = fs.readdirSync(`./src/${folderName}/`);
    const files = folder.map((file) => {
        const info = fs.statSync(`./src/${folderName}/${file}`);
        if (info.isFile()) {
            return `@src/${folderName}/${file}`;
        } else if (info.isDirectory() && recursive) {
            const childPath = `${folderName}/${file}` as AllFolders;
            const subfolder = getFiles(childPath);
            allFiles.push(...subfolder);
        }
    }).filter((file) => file !== undefined);

    allFiles.push(...files);

    return allFiles;
}