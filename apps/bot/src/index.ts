import 'dotenv/config';
import { ExtendedClient } from "@class/extendClient";
import { GracefulShutdown } from "./class/gracefulShutdown";

export const start = Date.now();

export const client = new ExtendedClient();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

await client.start();

client.logger.info("bot started in " + (Date.now() - start) + "ms");

// Setup graceful shutdown handling
GracefulShutdown.setup(client);


export default client;