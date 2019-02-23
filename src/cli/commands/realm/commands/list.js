const {
    app: { Subsystem, MainCommandMeta },
    is,
    runtime: { term }
} = adone;


export default class extends Subsystem {
    @MainCommandMeta({
        arguments: [
            {
                name: "keyword",
                type: String,
                default: "",
                help: "Name or keyword for searching"
            }
        ]
    })
    async listCommand(args) {
        try {
            const realmManager = adone.realm.getManager();
            await realmManager.initialize();
            
            adone.cli.kit.observe("progress", realmManager);
            const observer = await realmManager.list({
                keyword: args.get("keyword")
            });
            const result = await observer.result;

            if (result.length > 0) {
                console.log(adone.pretty.table(result, {
                    borderless: true,
                    noHeader: true,
                    style: {
                        head: null,
                        compact: true
                    },
                    model: [
                        {
                            id: "name",
                            header: "Package",
                            handle: (item) => {
                                const color = item.isValid ? "{green-fg}" : "{red-fg}";
                                const version = is.undefined(item.version) ? "" : ` ${item.version}`;
                                const description = is.undefined(item.description) ? "" : ` {grey-fg}- ${item.description}{/grey-fg}`;
                                const invalid = item.isValid ? "" : `{red-fg} (${item.errInfo}){/red-fg}`;
                                const symlink = item.isSymlink ? " {yellow-fg}(symlink){/yellow-fg}" : "";

                                return `${color}{bold}${item.name}{/bold}${version}{/}${symlink}${description}${invalid}`;
                            }
                        }
                    ]
                }));
            } else {
                term.print("{white-fg}No packages{/}\n");
            }

            return 0;
        } catch (err) {
            // console.log(err);
            term.print(`{red-fg}${err.message}{/}\n`);
            return 1;
        }
    }
}
