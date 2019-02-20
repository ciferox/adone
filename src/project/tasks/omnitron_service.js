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

export default class OmnitronServiceTask extends project.BaseTask {
    async main(input) {
        return project.helper.createFile(TEMPLATE, input);
    }
}
