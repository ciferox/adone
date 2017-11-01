const {
    is,
    project
} = adone;

const TEMPLATE =
`#!/usr/bin/env node

const {
    application
} = adone;

class {{ name }} extends application.Application {
    async configure() {

    }

    async initialize() {

    }

    async main() {

        return 0;
    }

    async uninitialize() {

    }
}

application.run({{ name }});
`;

export default class ApplicationTask extends project.GeneratorTask {
    async run(input) {
        if (!is.string(input.name)) {
            throw new adone.x.NotValid("Name should be a valid string");
        }
        return this.context.helper.generateFile(TEMPLATE, input);
    }
}
