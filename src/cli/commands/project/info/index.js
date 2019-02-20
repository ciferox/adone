const {
    app: { Subsystem, MainCommandMeta },
    is,
    project,
    runtime: { term }
} = adone;


export default class extends Subsystem {
    @MainCommandMeta({
        options: [
            {
                name: "--common",
                help: "Display common information"
            },
            {
                name: "--struct",
                help: "Display project structure"
            },
            {
                name: "--tasks",
                help: "Display project tasks"
            }
        ]
    })
    async info(args, opts) {
        try {
            const manager = await project.Manager.load();

            console.log();

            if (opts.has("common") || !opts.hasSomething()) {
                console.log(adone.pretty.table(this._getCommonInfo(manager), {
                    width: "100%",
                    borderless: true,
                    noHeader: true,
                    style: {
                        head: null,
                        compact: true
                    },
                    model: [
                        {
                            id: "key",
                            width: 16
                        },
                        {
                            id: "value",
                            style: "{green-fg}"
                        }
                    ]
                }));
            }

            console.log();

            if (opts.has("tasks") || !opts.hasSomething()) {
                console.log(adone.pretty.table([
                    {
                        key: "Tasks",
                        value: manager.getTaskNames().sort().join(", ")
                    }
                ], {
                    width: "100%",
                    borderless: true,
                    noHeader: true,
                    style: {
                        head: null,
                        compact: true
                    },
                    model: [
                        {
                            id: "key",
                            width: 16
                        },
                        {
                            id: "value",
                            style: "{green-fg}",
                            wordWrap: true
                        }
                    ]
                }));
            }

            console.log();

            if (opts.has("struct") || !opts.hasSomething()) {
                const entries = manager.getProjectEntries({
                    path: null,
                    onlyNative: opts.has("native")
                });
                const structure = {};
                if (opts.has("full")) {
                    for (const entry of entries) {
                        structure[entry.id] = adone.util.omit(entry, "id");
                    }
                } else {
                    for (const entry of entries) {
                        structure[entry.id] = entry.description || "";
                    }
                }
                console.log(adone.pretty.json(structure));
            }


            return 0;
        } catch (err) {
            term.print(`{red-fg}${err.stack}{/}`);
            return 1;
        }
    }

    _getCommonInfo(manager) {
        const info = [];
        if (is.string(manager.config.raw.name)) {
            info.push({
                key: "Name",
                value: manager.config.raw.name
            });
        }

        if (is.string(manager.config.raw.version)) {
            info.push({
                key: "Version",
                value: manager.config.raw.version
            });
        }

        if (is.string(manager.config.raw.description)) {
            info.push({
                key: "Description",
                value: manager.config.raw.description
            });
        }

        if (is.string(manager.config.raw.type)) {
            info.push({
                key: "Type",
                value: manager.config.raw.type
            });
        }

        if (is.string(manager.config.raw.author)) {
            info.push({
                key: "Author",
                value: manager.config.raw.author
            });
        }

        return info;
    }
}
