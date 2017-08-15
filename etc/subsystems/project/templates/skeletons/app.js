#!/usr/bin/env node

import adone from "adone";

const {
    application
} = adone;

class {{ name }} extends application.Application {
    initialize() {
        // NOTE: application initialization logic
        // NOTE: define application command line interface
    }

    main() {
        // NOTE: application main logic

        adone.log("My awesome application");

        return application.Application.SUCCESS; // exit code
    }

    uninitialize() {
        // NOTE: application uninitialization logic
    }
}

application.run({{ name }});
