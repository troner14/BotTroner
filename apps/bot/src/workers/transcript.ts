import { randomUUIDv7 } from "bun";
import { writeFileSync, statSync, mkdirSync } from "node:fs";
import {brotliCompressSync} from "node:zlib";
import { parentPort } from "node:worker_threads";

interface workerData {
    html: string;
    channelId: string;
    guildId: string;
}


interface WorkerInput {
    html: string;
    channelId: string;
    guildId: string;
}

if (!parentPort) {
    throw new Error('This worker must be run as a Node worker thread.');
}

parentPort.on('message', async (event: WorkerInput) => {
    try {
        const { html, channelId, guildId } = event as workerData;
        const uuid = randomUUIDv7("hex");
        const buffer = brotliCompressSync(html);

        try {
            if (statSync('./transcripts').isDirectory() === false) {
                mkdirSync('./transcripts');
            }
        } catch {
            mkdirSync('./transcripts');
        }

        writeFileSync(`./transcripts/${uuid}.html.br`, buffer, { encoding: 'utf-8' });

        parentPort!.postMessage({ uuid, channelId, guildId, error: null });
    } catch (err) {
        parentPort!.postMessage({ error: (err as Error).message });
    }
});