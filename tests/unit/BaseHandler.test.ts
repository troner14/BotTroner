import { test, expect, describe, mock } from "bun:test";
import { BaseHandler, type HandlerContext, type IMiddleware, type HandlerResult } from "@src/handlers/core/BaseHandler";
import { MessageFlags, type ChatInputCommandInteraction } from "discord.js";

// Concrete implementation for testing
class TestHandler extends BaseHandler<ChatInputCommandInteraction> {
    public handleFn: ((context: HandlerContext<ChatInputCommandInteraction>) => Promise<void>) | null = null;

    constructor() {
        super("TestHandler");
    }

    async handle(context: HandlerContext<ChatInputCommandInteraction>): Promise<void> {
        if (this.handleFn) {
            await this.handleFn(context);
        }
    }

    // Expose protected methods for testing
    public testParseCustomId(customId: string) {
        return this.parseCustomId(customId);
    }

    public async testExecuteMiddlewares(context: HandlerContext<ChatInputCommandInteraction>) {
        return this.executeMiddlewares(context);
    }

    public async testHandleError(error: Error, context: HandlerContext<ChatInputCommandInteraction>) {
        return this.handleError(error, context);
    }
}

function createMockContext(overrides: Record<string, any> = {}): HandlerContext<ChatInputCommandInteraction> {
    return {
        interaction: {
            type: 2,
            user: { id: "user-1" },
            guildId: "guild-1",
            replied: false,
            deferred: false,
            reply: mock().mockResolvedValue(undefined),
            ...overrides,
        } as unknown as ChatInputCommandInteraction,
        client: {} as any,
    };
}

function createMiddleware(name: string, priority: number, result?: HandlerResult): IMiddleware<ChatInputCommandInteraction> {
    return {
        name,
        priority,
        execute: mock().mockResolvedValue(result ?? { success: true }),
    };
}

describe("BaseHandler", () => {

    describe("middleware execution", () => {
        test("executes middlewares in priority order", async () => {
            const handler = new TestHandler();
            const order: string[] = [];

            const mid1: IMiddleware<ChatInputCommandInteraction> = {
                name: "first",
                priority: 1,
                execute: mock().mockImplementation(async () => {
                    order.push("first");
                    return { success: true };
                }),
            };

            const mid2: IMiddleware<ChatInputCommandInteraction> = {
                name: "second",
                priority: 10,
                execute: mock().mockImplementation(async () => {
                    order.push("second");
                    return { success: true };
                }),
            };

            // Add in reverse order — should still execute by priority
            handler.use(mid2);
            handler.use(mid1);

            const ctx = createMockContext();
            const result = await handler.testExecuteMiddlewares(ctx);

            expect(result).toBe(true);
            expect(order).toEqual(["first", "second"]);
        });

        test("stops execution when middleware fails", async () => {
            const handler = new TestHandler();

            const mid1 = createMiddleware("fail", 1, { success: false });
            const mid2 = createMiddleware("never-reached", 10);

            handler.use(mid1);
            handler.use(mid2);

            const ctx = createMockContext();
            const result = await handler.testExecuteMiddlewares(ctx);

            expect(result).toBe(false);
            expect(mid2.execute).not.toHaveBeenCalled();
        });

        test("stops execution when middleware throws", async () => {
            const handler = new TestHandler();

            const throwMid: IMiddleware<ChatInputCommandInteraction> = {
                name: "thrower",
                priority: 1,
                execute: mock().mockRejectedValue(new Error("middleware error")),
            };
            const mid2 = createMiddleware("never-reached", 10);

            handler.use(throwMid);
            handler.use(mid2);

            const ctx = createMockContext();
            const result = await handler.testExecuteMiddlewares(ctx);

            expect(result).toBe(false);
            expect(mid2.execute).not.toHaveBeenCalled();
        });

        test("returns true when no middlewares", async () => {
            const handler = new TestHandler();
            const ctx = createMockContext();
            const result = await handler.testExecuteMiddlewares(ctx);
            expect(result).toBe(true);
        });
    });

    describe("parseCustomId", () => {
        test("returns id and empty params for simple customId", () => {
            const handler = new TestHandler();
            const result = handler.testParseCustomId("simple-id");
            expect(result).toEqual({ id: "simple-id", params: [] });
        });

        test("splits customId by underscore", () => {
            const handler = new TestHandler();
            const result = handler.testParseCustomId("action_param1_param2");
            expect(result).toEqual({ id: "action", params: ["param1", "param2"] });
        });

        test("handles single param", () => {
            const handler = new TestHandler();
            const result = handler.testParseCustomId("btn_123");
            expect(result).toEqual({ id: "btn", params: ["123"] });
        });
    });

    describe("handleError", () => {
        test("replies with ephemeral error message", async () => {
            const handler = new TestHandler();
            const ctx = createMockContext();
            const error = new Error("test failure");

            await handler.testHandleError(error, ctx);

            expect((ctx.interaction as any).reply).toHaveBeenCalledWith({
                content: "❌ Ha ocurrido un error inesperado. Por favor, intenta de nuevo más tarde.",
                flags: MessageFlags.Ephemeral,
            });
        });

        test("does not reply if already replied", async () => {
            const handler = new TestHandler();
            const ctx = createMockContext({ replied: true });
            const error = new Error("test");

            await handler.testHandleError(error, ctx);

            expect((ctx.interaction as any).reply).not.toHaveBeenCalled();
        });

        test("does not reply if already deferred", async () => {
            const handler = new TestHandler();
            const ctx = createMockContext({ deferred: true });
            const error = new Error("test");

            await handler.testHandleError(error, ctx);

            expect((ctx.interaction as any).reply).not.toHaveBeenCalled();
        });
    });

    describe("execute (full pipeline)", () => {
        test("runs middlewares then handler", async () => {
            const handler = new TestHandler();
            const order: string[] = [];

            const mid: IMiddleware<ChatInputCommandInteraction> = {
                name: "logger",
                priority: 1,
                execute: mock().mockImplementation(async () => {
                    order.push("middleware");
                    return { success: true };
                }),
            };
            handler.use(mid);

            handler.handleFn = async () => {
                order.push("handler");
            };

            const ctx = createMockContext();
            await handler.execute(ctx);

            expect(order).toEqual(["middleware", "handler"]);
        });

        test("skips handler when middleware fails", async () => {
            const handler = new TestHandler();
            const mid = createMiddleware("blocker", 1, { success: false });
            handler.use(mid);

            let handlerCalled = false;
            handler.handleFn = async () => {
                handlerCalled = true;
            };

            const ctx = createMockContext();
            await handler.execute(ctx);

            expect(handlerCalled).toBe(false);
        });

        test("catches handler errors and calls handleError", async () => {
            const handler = new TestHandler();
            handler.handleFn = async () => {
                throw new Error("handler boom");
            };

            const ctx = createMockContext();
            await handler.execute(ctx);

            // handleError should have replied
            expect((ctx.interaction as any).reply).toHaveBeenCalled();
        });
    });

    describe("use method", () => {
        test("returns this for chaining", () => {
            const handler = new TestHandler();
            const mid = createMiddleware("a", 1);
            const result = handler.use(mid);
            expect(result).toBe(handler);
        });
    });
});
