const {
    project
} = adone;

const TEMPLATE =
`const {
    application
} = adone;

const {
    Command
} = application.CliApplication;

export default class {{ name }} extends application.Subsystem {
    async configure() {
    }

    async initialize() {
    }

    @Command({
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
        return project.generator.helper.generateFile(TEMPLATE, input);
    }
}
