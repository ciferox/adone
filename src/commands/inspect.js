const {
    is,
    error,
    app: {
        Subsystem,
        mainCommand
    },
    lodash: { get },
    pretty
} = adone;

const GLOBALS = ["adone", "global"];

const getOwnPropertyDescriptor = (obj, propName) => {
    let descr = Object.getOwnPropertyDescriptor(obj, propName);
    if (!is.undefined(descr)) {
        return descr;
    }

    let o = obj.__proto__;
    for (; ;) {
        if (!o) {
            return undefined;
        }
        descr = Object.getOwnPropertyDescriptor(o, propName);
        if (!is.undefined(descr)) {
            return descr;
        }
        o = o.__proto__;
    }
};

const parseName = (name) => {
    const namespaceParts = [];
    const parts = name.split(".");

    do {
        if (!is.namespace(get(global, [...namespaceParts, parts[0]]))) {
            break;
        }
        namespaceParts.push(parts.shift());
    } while (parts.length > 0);

    return {
        namespace: namespaceParts.join("."),
        objectPath: parts.join(".")
    };
};

export default class Inspection extends Subsystem {
    @mainCommand({
        arguments: [
            {
                name: "name",
                type: String,
                default: "",
                help: "Name of class/object/function/namespace"
            }
        ],
        options: [
            {
                name: ["--all", "-A"],
                help: "Show all properties (be default it shows only enumerables)"
            },
            {
                name: ["--value", "-V"],
                help: "Show value instead of description"
            },
            {
                name: "--native",
                help: "Use native `typeof` for type detection"
            },
            {
                name: ["--as-object", "-O"],
                help: "Interpret as plain object"
            },
            {
                name: "--func-details",
                help: "Show function details"
            },
            {
                name: "--style",
                type: String,
                default: "color",
                choices: ["none", "inline", "color", "html"],
                help: "Style to use"
            },
            {
                name: ["--depth", "-D"],
                type: Number,
                default: 1,
                help: "The depth of object inspection"
            },
            {
                name: "--descr",
                help: "The depth of object inspection"
            },
            {
                name: "--no-sort",
                help: "Sort by keys"
            },
            {
                name: "--no-type",
                help: "Without type and constructor"
            },
            {
                name: "--no-proto",
                help: "Without proto"
            }
        ]
    })
    async inspect(args, opts) {
        try {
            const inspectOptions = {
                style: opts.get("style"),
                depth: opts.get("depth"),
                noType: opts.has("noType"),
                noDescriptor: !opts.has("descr"),
                sort: !opts.has("noSort"),
                proto: !opts.has("noProto"),
                enumOnly: !opts.has("all"),
                asObject: opts.has("asObject"),
                native: opts.has("native"),
                useInspect: true,
                funcDetails: opts.has("funcDetails")
            };

            let name = args.get("name");

            if (name.length === 0) {
                console.log("Global namespaces:");
                console.log(pretty.json(GLOBALS));
                return 0;
            }

            const parts = name.split(".");
            let namespace;
            let objectPath;

            // Reduce 'adone' + 'global' chain...
            while (parts.length > 1) {
                if (GLOBALS.includes(parts[0]) && GLOBALS.includes(parts[1])) {
                    parts.shift();
                    name = parts.join(".");
                } else {
                    break;
                }
            }

            if (!GLOBALS.includes(parts[0])) {
                throw new error.UnknownException(`Unknown namespace: ${name}`);
            }

            if (parts[0] === "global") {
                namespace = "global";
                objectPath = (parts.length === 1)
                    ? ""
                    : parts.slice(1).join(".");
            } else if (parts[0] in global) {
                const result = parseName(name);
                namespace = result.namespace;
                objectPath = result.objectPath;
            }

            const showValue = opts.has("value");
            if ((showValue || inspectOptions.asObject) && objectPath.length === 0) {
                const tmp = namespace.split(".");
                objectPath = tmp.pop();
                namespace = tmp.join(".");
            }

            let ns;
            switch (namespace) {
                case "global":
                    ns = global;
                    break;
                case "adone":
                    ns = adone;
                    break;
                default:
                    ns = get(global, namespace);
            }

            let result;
            if (objectPath.length === 0) {
                result = adone.inspect(ns, inspectOptions);
            } else {
                const parts = objectPath.split(".");

                let obj = ns;
                for (const part of parts) {
                    const propDescr = getOwnPropertyDescriptor(obj, part);
                    if (is.undefined(propDescr)) {
                        throw new error.UnknownException(`Unknown object: ${name}`);
                    }
                    obj = obj[part];
                }
                const type = adone.typeOf(obj);

                switch (type) {
                    case "function":
                    case "class":
                        result = showValue
                            ? adone.js.highlight(obj.toString())
                            : adone.inspect(get(ns, objectPath), inspectOptions);
                        break;
                    default:
                        result = showValue
                            ? obj
                            : adone.inspect(get(ns, objectPath), inspectOptions);
                }
            }
            console.log(result);

            return 0;
        } catch (err) {
            console.log(pretty.error(err));
            return 1;
        }
    }
}
