const {
    is,
    project
} = adone;

const TEMPLATE =
`#!/usr/bin/env node

import "adone";

const {
    app,
    runtime: { term }
} = adone;

const {
    CommandMeta,
    MainCommandMeta
} = app;

class {{ name }}Application extends app.CliApplication {
    async configure() {
    
    }

    async initialzie() {
    
    }

    @MainCommandMeta({
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

    @CommandMeta({
        name: "test",
        help: "Test command",
    })
    async testCommand(args, opts) {
        term.print("{bold}Test command successfully executed!{/}\\n");
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
