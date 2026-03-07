import { test, expect, describe, beforeEach, mock } from "bun:test";
import { ComponentHandler } from "@src/handlers/interactions/ComponentHandler";

function createMockComponent(name: string, optionalParams?: Record<string, string>) {
    return {
        data: { name },
        optionalParams: optionalParams ?? undefined,
        run: mock().mockResolvedValue(undefined),
        type: "button" as const,
    };
}

function createMockInteraction(customId: string) {
    return {
        customId,
        user: { id: "user-1" },
        guildId: "guild-1",
        reply: mock().mockResolvedValue(undefined),
        replied: false,
        deferred: false,
    } as any;
}

describe("ComponentHandler", () => {
    let handler: ComponentHandler;
    let mockClient: any;

    beforeEach(() => {
        handler = new ComponentHandler({ type: "button", clientKey: "buttons" });
        mockClient = {
            buttons: new Map(),
            logger: {
                child: mock().mockReturnValue({
                    debug: mock(),
                    info: mock(),
                    warn: mock(),
                    error: mock(),
                }),
            },
        };
    });

    describe("basic component resolution", () => {
        test("resolves and executes component by customId", async () => {
            const component = createMockComponent("test-btn");
            mockClient.buttons.set("test-btn", component);

            const interaction = createMockInteraction("test-btn");
            await handler.handle({ interaction, client: mockClient });

            expect(component.run).toHaveBeenCalledTimes(1);
            expect(component.run).toHaveBeenCalledWith(
                expect.objectContaining({
                    interaction,
                    client: mockClient,
                })
            );
        });

        test("throws when component not found", async () => {
            const interaction = createMockInteraction("nonexistent");

            expect(
                handler.handle({ interaction, client: mockClient })
            ).rejects.toThrow();
        });
    });

    describe("customId parsing with optional params", () => {
        test("parses customId_param1_param2 format", async () => {
            const component = createMockComponent("vm-action", {
                panelId: "number",
                vmId: "string",
            });
            mockClient.buttons.set("vm-action", component);

            const interaction = createMockInteraction("vm-action_42_vm-100");
            await handler.handle({ interaction, client: mockClient });

            expect(component.run).toHaveBeenCalledWith(
                expect.objectContaining({
                    optionalParams: {
                        panelId: "42",
                        vmId: "vm-100",
                    },
                })
            );
        });

        test("handles customId with no params", async () => {
            const component = createMockComponent("simple-btn");
            mockClient.buttons.set("simple-btn", component);

            const interaction = createMockInteraction("simple-btn");
            await handler.handle({ interaction, client: mockClient });

            expect(component.run).toHaveBeenCalledWith(
                expect.objectContaining({
                    optionalParams: {},
                })
            );
        });

        test("handles customId with single param", async () => {
            const component = createMockComponent("confirm", {
                hash: "string",
            });
            mockClient.buttons.set("confirm", component);

            const interaction = createMockInteraction("confirm_abc123");
            await handler.handle({ interaction, client: mockClient });

            expect(component.run).toHaveBeenCalledWith(
                expect.objectContaining({
                    optionalParams: {
                        hash: "abc123",
                    },
                })
            );
        });

        test("handles extra params beyond defined keys", async () => {
            const component = createMockComponent("action", {
                id: "string",
            });
            mockClient.buttons.set("action", component);

            const interaction = createMockInteraction("action_123_extra_data");
            await handler.handle({ interaction, client: mockClient });

            // Only first key should be mapped
            expect(component.run).toHaveBeenCalledWith(
                expect.objectContaining({
                    optionalParams: {
                        id: "123",
                    },
                })
            );
        });
    });

    describe("component without optionalParams definition", () => {
        test("does not map params even with underscored customId", async () => {
            const component = createMockComponent("no-params");
            delete component.optionalParams;
            mockClient.buttons.set("no-params", component);

            const interaction = createMockInteraction("no-params_some_data");
            await handler.handle({ interaction, client: mockClient });

            expect(component.run).toHaveBeenCalledWith(
                expect.objectContaining({
                    optionalParams: {},
                })
            );
        });
    });

    describe("different component types", () => {
        test("creates handler for selectmenu type", () => {
            const selectHandler = new ComponentHandler({ type: "selectmenu", clientKey: "selectMenus" });
            expect(selectHandler).toBeDefined();
        });

        test("creates handler for modal type", () => {
            const modalHandler = new ComponentHandler({ type: "modal", clientKey: "modals" });
            expect(modalHandler).toBeDefined();
        });
    });
});
