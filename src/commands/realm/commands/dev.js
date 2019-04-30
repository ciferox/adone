const {
    app: { Subsystem, mainCommand },
    cli
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
    async devCommand(args, opts) {
        try {
            const path = this.parent.resolvePath(args, opts);
            const r = await this.parent.connectRealm({
                cwd: process.cwd(),
                progress: false
            });
            await r.runAndWait("watch", {
                realm: r,
                path
            });
        } catch (err) {
            console.error(adone.pretty.error(err));
            return 1;
        }
    }
}
