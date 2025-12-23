import { mock } from "bun:test";

// Guild Mock
export const createMockGuild = (id: string = "test-guild-123", name: string = "Test Guild") => ({
    id,
    name,
    ownerId: "owner-123",
    memberCount: 100,
    createdTimestamp: Date.now(),
    channels: {
        cache: new Map()
    },
    members: {
        cache: new Map()
    },
    roles: {
        cache: new Map()
    }
});

// Extended Prisma Mock for Guild Events
export class MockPrismaClientForGuilds {
    // Guilds table operations
    public guilds = {
        findMany: mock().mockResolvedValue([
            { id: "guild-1", lang: "es-es" },
            { id: "guild-2", lang: "en-us" },
            { id: "guild-3", lang: "es-es" }
        ]),
        findUnique: mock().mockResolvedValue({ id: "test-guild-123", lang: "es-es" }),
        create: mock().mockResolvedValue({ id: "test-guild-123", lang: "es-es" }),
        update: mock().mockResolvedValue({ id: "test-guild-123", lang: "es-es" }),
        delete: mock().mockResolvedValue({ id: "test-guild-123", lang: "es-es" }),
        upsert: mock().mockResolvedValue({ id: "test-guild-123", lang: "es-es" })
    };

    // Guild commands operations
    public guilds_commandos = {
        findMany: mock().mockResolvedValue([
            { guildId: "guild-1", CommId: "ping", enabled: true },
            { guildId: "guild-1", CommId: "vm", enabled: true },
            { guildId: "guild-2", CommId: "ping", enabled: true }
        ]),
        findUnique: mock().mockResolvedValue(null),
        create: mock().mockResolvedValue({ guildId: "test-guild-123", CommId: "ping", enabled: true }),
        update: mock().mockResolvedValue({ guildId: "test-guild-123", CommId: "ping", enabled: true }),
        delete: mock().mockResolvedValue({ guildId: "test-guild-123", CommId: "ping", enabled: true }),
        upsert: mock().mockResolvedValue({ guildId: "test-guild-123", CommId: "ping", enabled: true }),
        deleteMany: mock().mockResolvedValue({ count: 2 })
    };

    // Transaction support
    public $transaction = mock().mockImplementation(async (operations) => {
        if (Array.isArray(operations)) {
            // Handle array of operations
            return Promise.all(operations.map(op => op));
        } else {
            // Handle function
            return operations(this);
        }
    });

    public $connect = mock().mockResolvedValue(undefined);
    public $disconnect = mock().mockResolvedValue(undefined);
}

// Extended Client Mock for Guild Events
export const createMockExtendedClient = (
    mockCommands: Map<string, any> = new Map([
        ["ping", { name: "ping" }],
        ["vm", { name: "vm" }]
    ])
) => {
    const mockLogger = {
        debug: mock(),
        info: mock(),
        warn: mock(),
        error: mock(),
        child: mock().mockReturnValue({
            debug: mock(),
            info: mock(),
            warn: mock(),
            error: mock()
        })
    };

    // Mock que previene la carga real de archivos en CI
    const mockExtendedClient = {
        logger: mockLogger,
        prisma: new MockPrismaClientForGuilds(),
        commands: mockCommands,
        user: {
            username: "TestBot",
            id: "bot-123"
        },
        readyTimestamp: Date.now(),
        // Prevenir carga real de comandos en tests
        prepare: mock().mockResolvedValue(undefined),
        loaderManager: {
            commands: {
                info: mockCommands,
                load: mock().mockResolvedValue(undefined)
            }
        }
    };

    return mockExtendedClient;
};

export { MockPrismaClientForGuilds as mockPrismaForGuilds };