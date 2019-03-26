const {
    is,
    project
} = adone;

const TEMPLATE =
`#!/usr/bin/env node

import "adone";

const {
    app
} = adone;

const {
    command,
    mainCommand
} = app;

class {{ name }}Application extends app.CliApplication {
    async configure() {
    
    }

    async initialzie() {
    
    }

    @mainCommand({
        blindMode: true,
        arguments: [
            {
                name: "color",
                type: String,
                choices: ["red", "green", "blue"],
                help: "Color of message"
            }
        ]
    })
    async main(args, opts) {
        console.log("Main command succesfully executed!");
        return 0;
    }

    @command({
        name: "test",
        help: "Test command",
    })
    async testCommand(args, opts) {
        console.log("Test command successfully executed!");
        return 0;
    }

}

app.runCli({{ name }}Application);
`;

export default class CliApplicationTask extends project.BaseTask {
    async main(input) {
        if (!is.string(input.name)) {
            throw new adone.error.NotValidException("Name should be a valid string");
        }
        return project.helper.createFile(TEMPLATE, input);
    }
}
