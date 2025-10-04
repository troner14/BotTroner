import { mock } from "bun:test";

// Mock Prisma Client
export class MockPrismaClient {
    public guilds_commandos = {
        findMany: mock().mockResolvedValue([]),
        findUnique: mock().mockResolvedValue(null),
        create: mock().mockResolvedValue({}),
        update: mock().mockResolvedValue({}),
        delete: mock().mockResolvedValue({}),
        upsert: mock().mockResolvedValue({})
    };

    public $queryRaw = mock().mockResolvedValue([
        {
            guildId: "test-guild-1",
            CommId: "ping,help,test"
        }
    ]);

    public $connect = mock().mockResolvedValue(undefined);
    public $disconnect = mock().mockResolvedValue(undefined);
    public $transaction = mock().mockImplementation((fn) => fn(this));
}

export const mockPrisma = new MockPrismaClient();