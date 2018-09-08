#!/usr/bin/env node

import "adone";

const {
    app
} = adone;

class TestJsApplication extends app.Application {
    async configure() {

    }

    async initialize() {

    }

    async main() {
        adone.runtime.term.print("{bold}Awesome adone application!{/}\n");
        return 0;
    }

    async uninitialize() {

    }
}

app.run(TestJsApplication);
