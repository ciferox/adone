const {
    cli: { chalk },
    app: { Subsystem, mainCommand },
    pretty
} = adone;


export default class extends Subsystem {
    @mainCommand({
        options: [
            {
                name: "--common",
                help: "Show common information"
            },
            {
                name: "--units",
                help: "Show realm dev units"
            },
            {
                name: "--tasks",
                help: "Show realm tasks"
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
                console.log(chalk.bold("Common:"));
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
                console.log(chalk.bold("Tasks:"));
                console.log();
                if (result.tasks.length > 0) {
                    console.log(pretty.table(result.tasks.map((t) => ({
                        name: t
                    })), {
                        width: "100%",
                        borderless: true,
                        noHeader: true,
                        style: {
                            head: null,
                            compact: true
                        },
                        model: [
                            {
                                id: "name"
                            }
                        ]
                    }));
                } else {
                    console.log(chalk.grey.italic("no tasks"));
                }
            }

            if (result.units) {
                console.log();
                console.log(chalk.bold("Dev units:"));
                console.log();
                console.log(pretty.table(result.units, {
                    width: "100%",
                    borderless: true,
                    noHeader: true,
                    style: {
                        head: null,
                        compact: true
                    },
                    model: [
                        {
                            id: "id"
                        },
                        {
                            id: "description",
                            style: "{green-fg}",
                            wordWrap: true
                        }
                    ]
                }));
            }

            return 0;
        } catch (err) {
            console.error(pretty.error(err));
            return 1;
        }
    }
}
