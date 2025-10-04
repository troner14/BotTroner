import { mock } from "bun:test";

// Mock Discord.js Client
export class MockClient {
    public guilds = {
        cache: new Map(),
        fetch: mock().mockResolvedValue({
            id: "test-guild-id",
            name: "Test Guild",
            commands: {
                set: mock().mockResolvedValue([])
            }
        })
    };

    public user = {
        id: "test-bot-id",
        username: "TestBot",
        tag: "TestBot#0000"
    };

    public login = mock().mockResolvedValue("test-token");
    public destroy = mock().mockResolvedValue(undefined);

    constructor() {
        // Add some default guilds to cache
        this.guilds.cache.set("test-guild-1", {
            id: "test-guild-1",
            name: "Test Guild 1",
            commands: {
                set: mock()
            }
        });
    }
}

// Mock Discord.js Interaction
export class MockInteraction {
    public isCommand = mock().mockReturnValue(true);
    public isAutocomplete = mock().mockReturnValue(false);
    public isButton = mock().mockReturnValue(false);
    public isSelectMenu = mock().mockReturnValue(false);
    
    public commandName = "test-command";
    public user = {
        id: "test-user-id",
        username: "TestUser"
    };
    
    public guild = {
        id: "test-guild-id",
        name: "Test Guild"
    };

    public options = {
        getString: mock().mockReturnValue("test"),
        getInteger: mock().mockReturnValue(42),
        getBoolean: mock().mockReturnValue(true),
        getUser: mock().mockReturnValue(null),
        getChannel: mock().mockReturnValue(null)
    };

    public reply = mock().mockResolvedValue(undefined);
    public followUp = mock().mockResolvedValue(undefined);
    public deferReply = mock().mockResolvedValue(undefined);
}