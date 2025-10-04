import * as fs from 'fs';
import * as path from 'path';

const getFolders = (dir: string, parent?: string): string[] => {
    const folders: string[] = [];

    fs.readdirSync(dir).forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            const folderName = parent ? `${parent}/${file}` : file;
            folders.push(folderName);
            folders.push(...getFolders(filePath, folderName));
        }
    });

    return folders;
}


async function generateListFolder() {
    const folderPath = path.resolve(__dirname, '../src/');

    const types: string[] = getFolders(folderPath);

    const typeList = types.map(key => `'${key}'`).join(' | ');
    const allTypes = `// fichero generado automaticamente NO modificar //\nexport type AllFolders = ${typeList};`;
    const fileContent = `${allTypes}\n`;

    const outputPath = path.resolve(__dirname, '../src/types/fileUtils.d.ts');
    fs.writeFileSync(outputPath, fileContent, 'utf8');
    console.log(`Tipos generados en: ${outputPath}`);
}

generateListFolder().then(() => {
    process.exit(0);
}).catch(console.error);