const {
    is,
    project
} = adone;

const TEMPLATE =
`#!/usr/bin/env node

import "adone";

const {
    application,
    runtime: { term }
} = adone;

const {
    DCliCommand,
    DMainCliCommand
} = application;

class {{ name }}Application extends application.CliApplication {
    async configure() {
    
    }

    async initialzie() {
    
    }

    @DMainCliCommand({
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
        const color = args.get("color");
        term.print(\`{\${color}-fg}Main command succesfully executed!{/\${color}-fg}\\n\`);
        return 0;
    }

    @DCliCommand({
        name: "test",
        help: "Test command",
    })
    async testCommand(args, opts) {
        term.print("{bold}Test command successfully executed!{/}\\n");
        return 0;
    }

}

application.runCli({{ name }}Application);
`;

export default class CliApplicationTask extends project.generator.task.Base {
    async run(input) {
        if (!is.string(input.name)) {
            throw new adone.x.NotValid("Name should be a valid string");
        }
        return project.generator.helper.createFile(TEMPLATE, input);
    }
}
