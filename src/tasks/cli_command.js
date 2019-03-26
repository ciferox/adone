const {
    project
} = adone;

const TEMPLATE =
`const {
    app
} = adone;

const {
    command
} = app;

export default class {{ name }} extends app.Subsystem {
    async configure() {
    }

    async initialize() {
    }

    @command({
        name: "test",
        help: "Test command"
    })
    async testCommand(args, opts) {
        console.log("Test command successfully executed!");
        return 0;
    }
}
`;

export default class CliCommandTask extends project.BaseTask {
    async main(input) {
        return project.helper.createFile(TEMPLATE, input);
    }
}
