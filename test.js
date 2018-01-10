#!/usr/bin/env node

import "a";

const {
    application
} = adone;

class TestJsApplication extends application.Application {
    async configure() {

    }

    async initialize() {

    }

    async main() {
        const gyp = new adone.gyp.Gyp();
        await gyp.run({
            name: "configure",
            args: []
        }, {
            directory: "/________/ciferox/adone/src/glosses/data/bson/native"
        });
        // adone.runtime.term.print("{bold}Awesome adone application!{/}\n");
        // return 0;
    }

    async uninitialize() {

    }
}

application.run(TestJsApplication);
