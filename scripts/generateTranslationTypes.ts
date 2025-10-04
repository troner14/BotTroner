import * as fs from 'fs';
import * as path from 'path';
import { exit } from 'process';
import { PrismaClient } from '@prismaClient';

async function generateTranslationTypes() {
    // Consulta todas las traducciones desde la base de datos
    const pclient = new PrismaClient();
    const allTranslations = await pclient.traducciones.findMany();
    const allLangs = await pclient.traducciones.findMany({
        distinct: ['lang'],
        select: { lang: true }
    }).then(results => results.map(r => r.lang));
    // const allLangs = await traducciones.findAllLangs();
    // const allTranslations = await traducciones.findByLang("es-es");

    const keys: string[] = [];
    const variablesMap: Record<string, string[]> = {};

    // Analiza las claves y variables
    for (const translation of allTranslations) {
        const { key, value } = translation; // title = key, value = translation string
        keys.push(key);

        // Encuentra variables en el formato {variable}
        const variables = [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]);
        if (variables.length > 0) {
            variablesMap[key] = variables as string[];
        }
    }

    // Genera el contenido del archivo de tipos
    const keyTypes = keys.map(key => `'${key}'`).join(' | ');
    const translationKeyType = `// fichero generado automaticamente NO modificar //\nexport type TranslationKey = ${keyTypes};`;
    const langTypes = allLangs.map(lang => `'${lang}'`).join(' | ');
    const translationType = `export type langsKey = ${langTypes}`;

    const translationVariablesType = `export type TranslationVariables = {\n${Object.entries(variablesMap)
        .map(([key, vars]) => {
            const variablesString = vars.map(v => `${v}: string`).join('; ');
            return `    '${key}': { ${variablesString} };`;
        })
        .join('\n')}};`;

    const fileContent = `${translationKeyType}\n\n${translationType}\n\n${translationVariablesType}\n`;

    // Escribe el archivo de tipos
    const outputPath = path.resolve(__dirname, '../src/types/translationTypes.d.ts');
    fs.writeFileSync(outputPath, fileContent, 'utf8');

    console.log(`Tipos de traducción generados en: ${outputPath}`);
}

generateTranslationTypes().then(() => {
    exit(0);
}).catch(console.error);
