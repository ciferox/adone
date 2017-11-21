const {
    project
} = adone;

const TEMPLATE =
`const {
    omnitron: { Service }
} = adone;

export default class {{ name }} extends Service {
    async configureService() {
    }

    async initializeService() {
    }

    async uninitializeService() {
    }
}
`;

export default class OmnitronServiceTask extends project.generator.task.Base {
    async run(input) {
        return project.generator.helper.createFile(TEMPLATE, input);
    }
}
