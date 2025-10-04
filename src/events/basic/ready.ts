import type {ExtendedClient} from "@class/extendClient"
import { Events } from "discord.js"


export const name = Events.ClientReady;
export const once = true;
export const active = true;

export const run = (client: ExtendedClient) => {
    client.logger.info(`${client.user?.username} is Ready! ${Date.now()- (client.readyTimestamp ?? 0)} ms`)
}