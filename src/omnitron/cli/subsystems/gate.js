import Subsystem from "../subsystem";

const {
    application: {
        DCliCommand
    }
} = adone;

export default class Gate extends Subsystem {
    async initialize() {
        
    }

    @DCliCommand({
        name: "list",
        help: "Show all gates"
    })
    async listCommand(args) {
        return 0;
    }

    @DCliCommand({
        name: "add",
        help: "Add new gate"
    })
    async addCommand(args) {
        return 0;
    }

    @DCliCommand({
        name: ["delete", "del"],
        help: "Delete gate"
    })
    async deleteCommand(args) {
        return 0;
    }

    @DCliCommand({
        name: "up",
        help: "Up gate"
    })
    async upCommand(args) {
        return 0;
    }

    @DCliCommand({
        name: "down",
        help: "Down gate"
    })
    async downCommand(args) {
        return 0;
    }
}
