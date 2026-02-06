// import { traducciones } from '../database/models/traducciones';
import type { langsKey, TranslationKey, TranslationVariables } from "@dTypes/translationTypes";
import { prisma } from "@class/prismaClient";
import type { ExtendedClient } from "@src/class/extendClient";


type TranslationCache = Map<string, Map<string, string>>;

const translationCache: TranslationCache = new Map();
const pclient = prisma;

export async function loadTranslations() {
    const translations = await pclient.traducciones.findMany();
    for (const translation of translations) {
        if (!translationCache.has(translation.lang)) {
            translationCache.set(translation.lang, new Map());
        }
        translationCache.get(translation.lang)!.set(translation.key, translation.value);
    }
}

/**
 * Fetches a translation from the database, caches it, and replaces variables.
 * @param language The language of the translation.
 * @param key The key of the translation to fetch.
 * @param variables An object containing variables to replace in the translation.
 * @returns The translated value with variables replaced.
 */
export async function getTranslation<K extends TranslationKey>(
    language: langsKey,
    key: K,
    variables?: K extends keyof TranslationVariables ? TranslationVariables[K] : Record<string, string>
): Promise<string> {
    if (translationCache.has(language)) {
        const languageCache = translationCache.get(language);
        if (languageCache?.has(key)) {
            return replaceVariables(languageCache.get(key)!, variables);
        }
    }

    const translation = await pclient.traducciones.findFirst({
        select: { value: true },
        where: {
            lang: language,
            key: key
        }
    });

    if (!translation) {
        throw new Error(`Translation for key "${key}" in language "${language}" not found.`);
    }

    if (!translationCache.has(language)) {
        translationCache.set(language, new Map());
    }

    translationCache.get(language)!.set(key, translation.value);

    return replaceVariables(translation.value, variables);
}

/**
 * Replaces variables in a translation string.
 * @param template The translation string with placeholders.
 * @param variables An object containing variables to replace.
 * @returns The string with variables replaced.
 */
function replaceVariables(template: string, variables?: Record<string, string>): string {
    if (!variables) return template;

    return template.replace(/\{(\w+)\}/g, (_, variable) => {
        return variables[variable] ?? `{${variable}}`;
    }).replace(/\\n/g, "\n");
}

const guildLangs = new Map<string, langsKey>();

export async function getGuildLang(guildId: string, client: ExtendedClient): Promise<langsKey> {
    if (guildLangs.has(guildId)) {
        return guildLangs.get(guildId)!;
    }
    const guild = await client.prisma.guilds.findUnique({
        where: { id: guildId },
        select: { lang: true }
    });

    const lang = (guild?.lang || "es") as langsKey;
    guildLangs.set(guildId, lang);
    return lang;
}

export const T = getTranslation;
export const _U = getTranslation;