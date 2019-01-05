#!/usr/bin/env node

import "adone";

const {
    app
} = adone;

class TestJsApplication extends app.Application {
    async configure() {
        adone.cli.kit.setPrettyLogger();
    }

    async initialize() {

    }

    async main() {
        // adone.runtime.term.print("{bold}Awesome adone application!{/}\n");
        adone.log("verbose", "some new log message");
        adone.logInfo("information");
        adone.logError("error");
        adone.logWarn("warning");
        adone.logDebug("debug");
        console.log(adone.terminal.chalk["red"]("he he"))
        console.log("\u001b[32mSimply a test\u001b[39m");
        console.log(adone.text.stripAnsi("\u001b[32mSimply a test\u001b[39m"));
        return 0;
    }

    async uninitialize() {

    }
}

app.run(TestJsApplication);
