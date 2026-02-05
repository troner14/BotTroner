import type { VMAction } from "@bot/virtualization";

export default defineEventHandler(async (event) => {
    const manager = useVirtualizationManager();
    const session = await requireUserSession(event);
    const userId = session.user.id;

    const body = await readBody<{ action: VMAction["type"]; vmId: string, guildId: string, panelId: number }>(event, { strict: true});

    const result = await manager.executeVMAction(body.panelId, {
        type: body.action,
        vmId: body.vmId,
    }, userId, body.guildId);

    if (!result.success) {
        console.log("VM action failed:", result);
        throw createError({ statusCode: 400, statusMessage: result.error || "Failed to execute VM action" });
    }

    return { message: "VM action executed successfully", data: result.data };
})