const {
    project
} = adone;

const TEMPLATE =
`const {
    app
} = adone;

const {
    DCliCommand
} = app;

export default class {{ name }} extends app.Subsystem {
    async configure() {
    }

    async initialize() {
    }

    @DCliCommand({
        name: "test",
        help: "Test command"
    })
    async testCommand(args, opts) {
        adone.log("Test command successfully executed!");
        return 0;
    }
}
`;

export default class CliCommandTask extends project.generator.task.Base {
    async run(input) {
        return project.generator.helper.createFile(TEMPLATE, input);
    }
}
