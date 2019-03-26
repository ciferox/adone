const {
    app: { Subsystem, mainCommand }
} = adone;


export default class extends Subsystem {
    @mainCommand({
        arguments: [
            {
                name: "path",
                help: "Path to source file or name of adone namespace (e.g. 'adone.fs')"
            }
        ]
    })
    async depsCommand(args) {
        // only paths are supported
        const m = new adone.js.adone.Module({
            filePath: args.get("path")
        });
        await m.load();
        const deps = m.getAdoneDependencies();

        const keys = [...deps.keys()].sort();

        for (const key of keys) {
            const v = deps.get(key);
            let res = key;
            if (v.hasComputedValue) {
                res += "[*]";
            }
            console.log(res);
        }
    }
}
