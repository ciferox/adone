#!/usr/bin/env node

import adone from "adone";

class {{ name }} extends adone.application.Application {
    initialize() {
        // NOTE: application initialization logic
        // NOTE: define application command line interface
    }

    main() {
        // NOTE: application main logic

        return adone.application.Application.SUCCESS; // exit code
    }

    uninitialize() {
        // NOTE: application uninitialization logic
    }
}

adone.run({{ name }});
