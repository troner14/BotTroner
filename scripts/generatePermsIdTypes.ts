import * as fs from 'fs';
import * as path from 'path';
import { exit } from 'process';
import { PrismaClient } from "@prismaClient"

async function generateTranslationTypes() {
    const prisma = new PrismaClient();
    const allperms = await prisma.permisos.findMany();
    // const allperms = await Permisos.getAllPerms();

    const keys: string[] = [];

    for (const perm of allperms) {
        keys.push(perm.name);
    }

    const keyTypes = keys.map(key => `'${key}'`).join(' | ');
    const allPermsType = `// fichero generado automaticamente NO modificar //\nexport type AllPerms = ${keyTypes};`;
    const fileContent = `${allPermsType}\n`;

    const outputPath = path.resolve(__dirname, '../src/types/permsTypes.d.ts');
    fs.writeFileSync(outputPath, fileContent, 'utf8');
    console.log(`Tipos de permisos generados en: ${outputPath}`);

}

generateTranslationTypes().then(() => {
    exit(0);
}).catch(console.error);
