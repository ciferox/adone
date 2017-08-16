#!/usr/bin/env node

import adone from "adone";

const {
    is,
    application,
    std: { path }
} = adone;

class AdoneIoApplication extends application.Application {
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

        adone.info("application initialized");
    }

    async main(args, opts) {
        const env = opts.get("env");
        this._.config = this.config.app.envs[env];

        // load and initialize subsystems
        await this.loadSubsystemsFrom(path.join(__dirname, "..", "lib", "subsystems"), (name) => {
            switch (name) {
                case "http":
                    return is.plainObject(this._.config.http);
                default:
                    return true;
            }
        });
    }

    async uninitialize() {
        adone.info("application uninitialized");
    }
}

application.run(AdoneIoApplication);
