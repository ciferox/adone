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

// from lodash internals
const charCodeOfDot = ".".charCodeAt(0);
const reEscapeChar = /\\(\\)?/g;
const rePropName = RegExp(
    // Match anything that isn't a dot or bracket.
    "[^.[\\]]+" + "|" +
    // Or match property names within brackets.
    "\\[(?:" +
    // Match a non-string expression.
    '([^"\'].*)' + "|" +
    // Or match strings (supports escaping characters).
    '(["\'])((?:(?!\\2)[^\\\\]|\\\\.)*?)\\2' +
    ")\\]" + "|" +
    // Or match "" as the space between consecutive dots or empty brackets.
    "(?=(?:\\.|\\[\\])(?:\\.|\\[\\]|$))"
    , "g");

const stringToPath = (string) => {
    const result = [];
    if (string.charCodeAt(0) === charCodeOfDot) {
        result.push("");
    }
    string.replace(rePropName, (match, expression, quote, subString) => {
        let key = match;
        if (quote) {
            key = subString.replace(reEscapeChar, "$1");
        } else if (expression) {
            key = expression.trim();
        }
        result.push(key);
    });
    return result;
};

const cutNamespace = (parts) => {
    const namespaceParts = [];
    // const parts = name.split(".");

    do {
        if (parts[0].startsWith(".") || !is.namespace(get(global, [...namespaceParts, parts[0]]))) {
            break;
        }
        namespaceParts.push(parts.shift());
    } while (parts.length > 0);

    return namespaceParts.join(".");
};

export default ({ globals } = {}) => class InspectionCommand extends Subsystem {
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

            const name = args.get("name").split(".").filter(adone.identity).join(".");

            if (name.length === 0) {
                console.log("Global namespaces:");
                console.log(pretty.json(globals));
                return 0;
            }

            let parts = stringToPath(name);

            // Reduce 'adone' + 'global' chain...
            while (parts.length > 1) {
                if (globals.includes(parts[0]) && globals.includes(parts[1])) {
                    parts.shift();
                } else {
                    break;
                }
            }

            if (!globals.includes(parts[0])) {
                throw new error.UnknownException(`Unknown namespace: ${parts[0]}`);
            }

            let namespace;
            if (parts[0] === "global") {
                namespace = "global";
                parts.shift();
            } else if (parts[0] in global) {
                namespace = cutNamespace(parts);
            }

            const showValue = opts.has("value");
            if ((showValue || inspectOptions.asObject) && parts.length === 0) {
                const tmp = stringToPath(namespace);
                parts = [tmp.pop()];
                namespace = tmp.join(".");
            }

            let ns;
            if (namespace === "global") {
                ns = global;
            } else if (!namespace.includes(".")) {
                ns = global[namespace];
            } else {
                ns = get(global, namespace);
            }

            let result;
            if (parts.length === 0) {
                result = adone.inspect(ns, inspectOptions);
            } else {
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
                            : adone.inspect(get(ns, parts), inspectOptions);
                        break;
                    default:
                        result = showValue
                            ? obj
                            : adone.inspect(get(ns, parts), inspectOptions);
                }
            }
            console.log(result);

            return 0;
        } catch (err) {
            console.log(pretty.error(err));
            return 1;
        }
    }
};
