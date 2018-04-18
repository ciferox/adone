#!/usr/bin/env node

import "adone";

const {
    is,
    application,
    interface: { model }
} = adone;

class TestJsApplication extends application.Application {
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

application.run(TestJsApplication);
