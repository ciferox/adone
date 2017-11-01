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
    Command,
    MainCommand
} = application.CliApplication;

class {{ name }} extends application.CliApplication {
    async configure() {
    
    }

    async initialzie() {
    
    }

    @MainCommand({
        blindMode: true,
        arguments: [
            {
                name: "color",
                type: String,
                choices: ["red", green", "blue"]
                help: "Color of message"
            }
        ]
    })
    async main(args, opts) {
        const color = args.get("color");
        term.print(\`{\${color}-fg}Main command succesfully executed!{/\${color}-fg}\n\`);
        return 0;
    }

    @Command({
        name: "test",
        help: "Test command",
    })
    async testCommand(args, opts) {
        term.print("{bold}Test command successfully executed!{/}\n");
        return 0;
    }

}

application.runCli({{ name }});
`;

export default class CliApplicationTask extends project.generator.task.Base {
    async run(input) {
        if (!is.string(input.name)) {
            throw new adone.x.NotValid("Name should be a valid string");
        }
        return this.context.helper.generateFile(TEMPLATE, input);
    }
}
