const {
    app: { Subsystem, MainCommandMeta },
    is,
    pretty
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
            const manager = await this.parent.getRealm();

            if (opts.has("common") || !opts.hasSomething()) {
                console.log();
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

            if (opts.has("tasks") || !opts.hasSomething()) {
                console.log();
                console.log(adone.pretty.table([
                    {
                        key: "Tasks:",
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

            if (opts.has("struct") || !opts.hasSomething()) {
                console.log();
                console.log("Namespaces:");
                const entries = manager.getEntries({
                    path: null,
                    onlyNative: opts.has("native"),
                    excludeVirtual: false // TODO: make it configurable
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
            console.error(pretty.error(err));
            return 1;
        }
    }

    _getCommonInfo(manager) {
        const info = [];
        if (is.string(manager.package.name)) {
            info.push({
                key: "Name:",
                value: manager.package.name
            });
        }

        if (is.string(manager.package.version)) {
            info.push({
                key: "Version:",
                value: manager.package.version
            });
        }

        if (is.string(manager.package.description)) {
            info.push({
                key: "Description:",
                value: manager.package.description
            });
        }

        if (is.string(manager.package.author)) {
            info.push({
                key: "Author:",
                value: manager.package.author
            });
        }

        return info;
    }
}
