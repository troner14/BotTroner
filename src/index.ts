import { ExtendedClient } from "@class/extendClient";

export const start = Date.now();


export const client = new ExtendedClient();


await client.start();

client.logger.info("bot started in " + (Date.now() - start) + "ms");


export default client;