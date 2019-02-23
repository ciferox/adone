const {
    project
} = adone;

const TEMPLATE =
`const {
    app
} = adone;

const {
    CommandMeta
} = app;

export default class {{ name }} extends app.Subsystem {
    async configure() {
    }

    async initialize() {
    }

    @CommandMeta({
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
