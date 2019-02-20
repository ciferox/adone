const {
    is,
    configuration,
    project
} = adone;

export default class JsconfigTask extends project.BaseTask {
    async main(subCommand, info) {
        switch (subCommand) {
            case "create":
                return this._create(info);
        }

        // this.manager.notify(this, "progress", {
        //     message: "updating {bold}jsconfig.json{/bold}"
        // });

        // const config = new configuration.Jsconfig({
        //     cwd
        // });
        // const configPath = std.path.join(cwd, "jsconfig.json");
        // if (await fs.exists(configPath)) {
        //     await config.load();
        // } else {
        //     config.raw = {
        //         compilerOptions: {
        //             target: "es6",
        //             experimentalDecorators: true
        //         }
        //     };

        //     if (!context.flag.skipNpm) {
        //         config.raw.exclude = [
        //             "node_modules"
        //         ];
        //     }
        // }

        // if (is.array(include)) {
        //     if (!is.array(config.raw.include)) {
        //         config.raw.include = [];
        //     }
        //     for (const item of include) {
        //         if (!config.raw.include.includes(item)) {
        //             config.raw.include.push(item);
        //         }
        //     }
        // }

        // if (is.array(exclude)) {
        //     if (!is.array(config.raw.exclude)) {
        //         config.raw.exclude = [];
        //     }
        //     for (const item of exclude) {
        //         if (!config.raw.exclude.includes(item)) {
        //             config.raw.exclude.push(item);
        //         }
        //     }
        // }

        // return config.save();
    }

    async _create({ cwd, include, exclude, skipNpm } = {}) {
        this.manager.notify(this, "progress", {
            message: "creating {bold}jsconfig.json{/bold}"
        });

        const config = this.config = new configuration.Jsconfig({
            cwd
        });

        config.raw = {
            compilerOptions: {
                target: "es6",
                experimentalDecorators: true
            }
        };

        if (!skipNpm) {
            config.raw.exclude = [
                "node_modules"
            ];
        }

        if (is.array(include)) {
            this._updateList("include", include);
        }

        if (is.array(exclude)) {
            this._updateList("exclude", include);
        }

        return config.save();
    }

    _updateList(listName, values) {
        if (!this.config.has(listName)) {
            this.config.set(listName, []);
        }
        for (const item of values) {
            if (!this.config.raw[listName].includes(item)) {
                this.config.raw[listName].push(item);
            }
        }
    }
}
