const {
    is,
    project
} = adone;

const TEMPLATE =
`#!/usr/bin/env node

import "adone";

const {
    app
} = adone;

class {{ name }}Application extends app.Application {
    async configure() {

    }

    async initialize() {

    }

    async main() {
        adone.cli.print("{bold}Awesome adone application!{/}\\n");
        return 0;
    }

    async uninitialize() {

    }
}

app.run({{ name }}Application);
`;

export default class ApplicationTask extends project.BaseTask {
    async main(input) {
        this.manager.notify(this, "progress", {
            message: "generating application source files"
        });

        if (!is.string(input.name)) {
            throw new adone.error.NotValidException("Name should be a valid string");
        }
        return project.helper.createFile(TEMPLATE, input);
    }
}
