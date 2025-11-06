import { randomUUIDv7 } from "bun";
import { writeFileSync } from "node:fs";
import {brotliCompressSync} from "node:zlib";
// import {Tickets} from "@db/models/tickets"
import { PrismaClient } from "@prismaClient";

declare const self: Worker;

interface workerData {
    html: string;
    channelId: string;
    guildId: string;
}

self.onmessage = async (event) => {
    const { html, channelId, guildId } = event.data as workerData;
    const prisma = new PrismaClient();
    const uuid = randomUUIDv7("hex");
    const buffer = brotliCompressSync(html);

    writeFileSync(`./transcripts/${uuid}.html.br`, buffer, { encoding: 'utf-8' });
    
    const findedTicket = await prisma.tickets.findFirst({
        where: {
            channelId,
            guildId
        },
        select: {
            id: true
        }
    });

    if (findedTicket) {
        await prisma.tickets.update({
            where: {
                id: findedTicket.id
            },
            data: {
                transcript: uuid
            }
        });
    }
}