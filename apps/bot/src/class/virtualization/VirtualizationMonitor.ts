import { TextChannel } from "discord.js";
import type { ExtendedClient } from "@src/class/extendClient";
import type { Logger } from "pino";
import logger from "@utils/logger";
import { VirtualizationManager } from "./VirtualizationManager";
import { VmEmbedGenerator } from "./utils/embedGenerator";

interface MonitorEntry {
    guildId: string;
    channelId: string;
    messageId: string;
    panelId: number;
    vmId: string;
    lastUpdate: number;
    userId: string;
}

export class VirtualizationMonitor {
    private logger: Logger;
    private monitors: Map<string, MonitorEntry> = new Map(); // key: messageId
    private interval: Timer | null = null;
    private readonly UPDATE_INTERVAL = 5000;

    constructor(
        private client: ExtendedClient,
        private manager: VirtualizationManager
    ) {
        this.logger = logger.child({ module: "VirtualizationMonitor" });
    }

    /**
     * Start the global monitoring loop
     */
    public async start() {
        if (this.interval) return;

        // Load persistency
        try {
            const savedMonitors = await this.client.prisma.vm_monitors.findMany();
            for (const m of savedMonitors) {
                this.monitors.set(m.messageId, {
                    guildId: m.guildId,
                    channelId: m.channelId,
                    messageId: m.messageId,
                    panelId: m.panelId,
                    vmId: m.vmId,
                    userId: m.userId,
                    lastUpdate: Date.now()
                });
            }
            if (savedMonitors.length > 0) {
                this.logger.info(`Loaded ${savedMonitors.length} monitors from DB`);
            }
        } catch (error) {
            this.logger.error({ error }, "Failed to load monitors from DB");
        }

        this.logger.info("Starting Virtualization Monitor loop");
        this.interval = setInterval(() => this.processUpdates(), this.UPDATE_INTERVAL);
    }

    /**
     * Stop the global monitoring loop
     */
    public stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    /**
     * Register a new message to monitor a VM
     */
    public async addMonitor(entry: MonitorEntry) {
        // Remove existing monitor for this message if any
        this.monitors.set(entry.messageId, entry);

        // Save to DB
        try {
            await this.client.prisma.vm_monitors.create({
                data: {
                    guildId: entry.guildId,
                    channelId: entry.channelId,
                    messageId: entry.messageId,
                    panelId: entry.panelId,
                    vmId: entry.vmId,
                    userId: entry.userId
                }
            });
        } catch (error: any) {
            this.logger.error({
                error: error.message || error,
                code: error.code,
                data: entry
            }, "Failed to save monitor to DB");
            this.monitors.delete(entry.messageId); // Roll back in-memory addition
        }

        this.logger.debug({ ...entry }, "Added new VM monitor");
    }

    /**
     * Stop monitoring a specific message
     */
    public async removeMonitor(messageId: string) {
        this.monitors.delete(messageId);
        // Remove from DB
        try {
            await this.client.prisma.vm_monitors.delete({
                where: { messageId: messageId }
            }).catch(() => { }); // Ignore if not found
        } catch (error) {
            this.logger.error({ error }, "Failed to delete monitor from DB");
        }
    }

    public getMonitorByMessageId(messageId: string): MonitorEntry | undefined {
        return this.monitors.get(messageId);
    }

    public async stopMonitorForVM(vmId: string) {
        for (const [msgId, entry] of this.monitors.entries()) {
            if (entry.vmId === vmId) {
                this.monitors.delete(msgId);
                // Try to delete message
                try {
                    const channel = await this.client.channels.fetch(entry.channelId) as TextChannel;
                    if (channel) {
                        const msg = await channel.messages.fetch(msgId);
                        if (msg) await msg.delete();
                    }
                } catch (e) {
                    // Ignore errors if message is already gone
                }
            }
        }
    }

    /**
     * Main loop to process updates
     * Optimized to batch requests per panel if possible in future
     */
    private async processUpdates() {
        if (this.monitors.size === 0) return;

        // Group monitors by Panel to leverage caching or batched fetching in future
        // For now, we iterate and fetch individually but utilize the Manager's cache
        const updatePromises: Promise<void>[] = [];
        for (const [messageId, entry] of this.monitors.entries()) {
            const updatePromise = (async () => {
                try {
                    // Fetch current VM Status
                    const result = await this.manager.getVM(entry.panelId, entry.vmId);

                    if (!result.success || !result.data) {
                        // If VM is gone or error, maybe stop monitoring after X failures?
                        // For now just log and skip
                        return;
                    }

                    const vmStatus = result.data;

                    // Fetch Discord Message
                    const channel = await this.client.channels.fetch(entry.channelId) as TextChannel;
                    if (!channel) {
                        this.removeMonitor(messageId);
                        return;
                    }

                    try {
                        const message = await channel.messages.fetch(messageId);
                        if (!message) {
                            this.removeMonitor(messageId);
                            return;
                        }

                        // Generate new Embed
                        const embed = VmEmbedGenerator.generateStatusEmbed(vmStatus);
                        const components = VmEmbedGenerator.generateControlButtons(vmStatus);

                        // Update Message
                        // Only update if something changed? Or always to show "alive"? 
                        // Discord ignores edit if payload is identical, so it's safe to call.
                        await message.edit({
                            embeds: [embed],
                            components: components
                        });

                    } catch (msgError) {
                        // Message probably deleted or no permission
                        this.logger.warn({ msgError, messageId }, "Failed to update monitor message");
                        this.removeMonitor(messageId);
                    }

                } catch (error) {
                    this.logger.error({ error, entry }, "Error in monitor loop");
                }
            })();
            updatePromises.push(updatePromise);
        }
        // Wait for all updates to complete, log any errors
        const results = await Promise.allSettled(updatePromises);
        for (const [i, result] of results.entries()) {
            if (result.status === "rejected") {
                const [messageId, entry] = Array.from(this.monitors.entries())[i] || [];
                this.logger.error({ error: result.reason, messageId, entry }, "Monitor update promise rejected");
            }
        }
    }
}
