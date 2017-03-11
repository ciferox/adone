const { is, std, fs, util } = adone;

export default class extends adone.application.Subsystem {
    initialize() {
        this.defineCommand({
            name: "meta",
            help: "cli interface for adone meta-management",
            handler: this.metaCommand,
            arguments: [
                {
                    name: "ns",
                    type: String,
                    default: "",
                    help: "Name of namespace"
                }
            ],
            commands: [
                {
                    name: "inspect",
                    help: "Inspect adone source [sub]tree",
                    arguments: [
                        {
                            name: "path",
                            type: String,
                            help: "relative path to code from 'src/glosses'"
                        }
                    ],
                    handler: this.inspectCommand
                },
                {
                    name: "slice",
                    help: "Make a slice of adone",
                    arguments: [
                        {
                            name: "ns",
                            help: "Name of namespace"
                        }
                    ],
                    options: [

                    ],
                    handler: this.sliceCommand
                }
            ]
        });
    }

    async metaCommand(args) {
        const parts = args.get("ns").split(".");
        if (parts.length > 0 && (parts[0] === "adone" || parts[0] === "")) {
            parts.shift();
        }
        let obj = adone;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!is.propertyOwned(obj, part)) {
                adone.log(`Unknown namespace: adone.${parts.slice(0, i + 1).join(".")}`);
                return 1;
            }
            obj = obj[part];
        }
        const key = parts.join(".");
        if (key === "") {
            obj = adone;
        } else {
            obj = adone.vendor.lodash.get(adone, key, undefined);
        }

        const type = util.typeOf(obj);
        switch (type) {
            case "function" : adone.log(adone.inspect(obj, { style: "color", depth: 1, funcDetails: true })); break;
            default: adone.log(adone.inspect(obj, { style: "color", depth: 1, funcDetails: true }));
        }
        
        return 0;
    }

    async inspectCommand(args, opts) {
        try {
            const path = args.get("path");
            const fullPath = std.path.resolve(this.app.adoneRootPath, "src", "glosses", path);
            if (!(await fs.exists(fullPath))) {
                throw new adone.x.NotExists(`Path '${fullPath}' is not exists`);
            }

            const files = await fs.readdir(fullPath);

            // const result = await fs.glob(util.globize()).map();

            adone.log(files);
            
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }
}
