const {
    app: { Subsystem, mainCommand },
    pretty
} = adone;


export default class extends Subsystem {
    @mainCommand({
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
            const rootRealm = await this.parent.connectRealm();
            const result = await rootRealm.runAndWait("realmInfo", {
                cwd: process.cwd(),
                ...opts.getAll()
            });

            if (result.common) {
                console.log();
                console.log(pretty.table(result.common, {
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

            if (result.tasks) {
                console.log();
                console.log(pretty.table(result.tasks, {
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

            if (result.struct) {
                console.log();
                console.log("Namespaces:");
                console.log(pretty.json(result.struct));
            }

            return 0;
        } catch (err) {
            // console.error(pretty.error(err));
            return 1;
        }
    }
}
