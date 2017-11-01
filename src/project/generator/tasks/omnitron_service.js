const {
    project
} = adone;

const TEMPLATE =
`const {
    omnitron: { Service }
} = adone;

export default class {{ name }} extends Service {
    async configure() {

        return super.configure();
    }

    async initialize() {

        return super.initialize();
    }

    async uninitialize() {

        return super.uninitialize();
    }
}
`;

export default class OmnitronServiceTask extends project.GeneratorTask {
    async run(input) {
        return this.context.helper.generateFile(TEMPLATE, input);
    }
}
