const {
    application
} = adone;

const {
    Command
} = application.CliApplication;

export default class Gate extends application.Subsystem {
    async initialize() {
        
    }

    @Command({
        name: "list",
        help: "Show all gates"
    })
    async listCommand(args) {
        return 0;
    }

    @Command({
        name: "add",
        help: "Add new gate"
    })
    async addCommand(args) {
        return 0;
    }

    @Command({
        name: ["delete", "del"],
        help: "Delete gate"
    })
    async deleteCommand(args) {
        return 0;
    }

    @Command({
        name: "up",
        help: "Up gate"
    })
    async upCommand(args) {
        return 0;
    }

    @Command({
        name: "down",
        help: "Down gate"
    })
    async downCommand(args) {
        return 0;
    }
}
