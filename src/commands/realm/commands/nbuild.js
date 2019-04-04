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
    async nbuildCommand(args, opts) {
        try {
            const path = this.parent.resolvePath(args, opts);
            const manager = await this.parent.connectRealm({ progress: false });
            const observer = await manager.run("nbuild", { path });
            const result = await observer.result;

            if (is.nil(result)) {
                console.log("Nothing to build");
            }
            return 0;
        } catch (err) {
            console.error(err);
            return 1;
        }
    }
}
