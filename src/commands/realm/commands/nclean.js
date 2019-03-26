const {
    app: { Subsystem, mainCommand },
    is
} = adone;


export default class extends Subsystem {
    @mainCommand({
        arguments: [
            {
                name: "path",
                nargs: "?",
                help: "Project entry path"
            }
        ],
        options: [
            {
                name: ["-re", "--re"],
                help: "Interpret 'path' as regular expression"
            }
        ]
    })
    async ncleanCommand(args, opts) {
        try {
            const path = this.parent.resolvePath(args, opts);
            const manager = await this.parent.getRealm();
            const observer = await manager.run("nclean", path);
            if (is.nil(observer)) {
                console.log("Nothing to clean");
            } else {
                await observer.result;
            }

            
            return 0;
        } catch (err) {
            console.log(err);
            // term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }
}
