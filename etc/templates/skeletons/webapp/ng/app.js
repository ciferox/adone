#!/usr/bin/env node

import adone from "adone";
import { HttpServerDispatcher } from "../lib/http";

const {
    is,
    std: { path }
} = adone;

class {{ name }} extends adone.application.Application {
    async initialize() {
        // register signals for application graceful shutdown
        this.exitOnSignal("SIGQUIT", "SIGTERM", "SIGINT");

        this.defineArguments({
            options: [
                {
                    name: "--env",
                    choices: ["dev", "prod"],
                    default: "dev",
                    help: "backend environment"
                }
            ]
        });

        // load application default configuration available as 'this.config.app.*'.
        await this.config.load(path.join(__dirname, "..", "etc", "config.js"), "app");

        adone.info("initialized");
    }

    async main(args, opts) {
        const env = opts.get("env");
        this._.config = this.config.app.envs[env];

        if (is.plainObject(this._.config.http)) {
            this._.httpDispatcher = new HttpServerDispatcher(this._.config.http);
            await this._.httpDispatcher.initialize();
        }
    }

    async uninitialize() {
        if (is.plainObject(this._.config.http)) {
            await this._.httpDispatcher.uninitialize();
        }

        adone.info("uninitialized");
    }
}

adone.run({{ name }});
