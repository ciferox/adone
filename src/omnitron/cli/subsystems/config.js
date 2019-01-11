const {
    app: {
        Subsystem,
        CommandMeta
    },
    cli: { kit }
} = adone;

export default class Config extends Subsystem {
    @CommandMeta({
        name: "set",
        help: "Set property value",
        arguments: [
            {
                name: "key",
                type: String,
                help: "Path to property"
            },
            {
                name: "value",
                type: String,
                help: "Property value"
            }
        ]
    })
    async setCommand(args) {
        try {
            kit.createProgress("setting");
            const key = args.get("key");
            const value = args.get("value");

            const config = await adone.omnitron.dispatcher.getConfiguration();
            await config.set(key, value);

            kit.updateProgress({
                message: "done",
                result: true
            });

            return 0;
        } catch (err) {
            kit.updateProgress({
                message: err.message,
                result: false
            });
            return 1;
        }
    }

    @CommandMeta({
        name: "get",
        help: "Get property value",
        arguments: [
            {
                name: "key",
                type: String,
                help: "Path to property"
            }
        ]
    })
    async getCommand(args) {
        try {
            kit.createProgress("getting");
            const key = args.get("key");

            const config = await adone.omnitron.dispatcher.getConfiguration();
            const value = await config.get(key);

            kit.updateProgress({
                message: "done",
                result: true,
                clean: true
            });

            adone.log(adone.pretty.json(value));
            return 0;
        } catch (err) {
            kit.updateProgress({
                message: err.message,
                result: false
            });
            return 1;
        }
    }

    @CommandMeta({
        name: ["delete", "del"],
        help: "Delete property",
        arguments: [
            {
                name: "key",
                type: String,
                help: "Path to property"
            }
        ]
    })
    async deleteCommand(args) {
        try {
            kit.createProgress("deleting");
            const key = args.get("key");

            const config = await adone.omnitron.dispatcher.getConfiguration();
            await config.delete(key);

            kit.updateProgress({
                message: "done",
                result: true
            });

            return 0;
        } catch (err) {
            kit.updateProgress({
                message: err.message,
                result: false
            });
            return 1;
        }
    }

    @CommandMeta({
        name: "all",
        help: "Show whole configuration"
    })
    async allCommand() {
        try {
            kit.createProgress("obtaining");
            const config = await adone.omnitron.dispatcher.getConfiguration();
            kit.updateProgress({
                message: "done",
                result: true,
                clean: true
            });

            adone.log(adone.pretty.json(await config.getAll()));
            return 0;
        } catch (err) {
            kit.updateProgress({
                message: err.message,
                result: false
            });
            return 1;
        }
    }

    @CommandMeta({
        name: "edit",
        help: "Open config in editor",
        options: [
            {
                name: ["--editor", "-e"],
                type: String,
                nargs: "?",
                help: "open file immediately in the editor"
            }
        ]
    })
    async editCommand(args, opts) {
        const config = await adone.omnitron.dispatcher.getConfiguration();
        // await (new adone.util.Editor({
        //     path: omnitron.Configuration.path,
        //     editor: opts.get("editor")
        // })).spawn({
        //     detached: true
        // });

        return 0;
    }
}
