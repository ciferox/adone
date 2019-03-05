const {
    is,
    error,
    app: {
        Subsystem,
        MainCommandMeta
    },
    lodash: { get },
    meta,
    pretty,
    runtime: { term }
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
    @MainCommandMeta({
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
                name: "--all",
                help: "Show all properties"
            },
            {
                name: ["--value", "-V"],
                help: "Show value instead of description"
            },
            {
                name: ["--object", "-O"],
                help: "Interpret as plain object"
            },
            {
                name: ["--depth", "-D"],
                type: Number,
                default: 1,
                help: "The depth of object inspection"
            }
        ]
    })
    async inspect(args, opts) {
        try {
            const inspectOptions = {
                style: "color",
                depth: opts.get("depth"),
                noDescriptor: true,
                noNotices: true,
                sort: true,
                proto: true
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

            if (objectPath === "") {
                const { util } = adone;

                const styleType = (type) => `{magenta-fg}${type}{/magenta-fg}`;
                const styleName = (name) => `{green-fg}{bold}${name}{/bold}{/green-fg}`;
                const styleArgs = (args) => `{green-fg}(${args.join(", ")}){/green-fg}`;
                const styleLiteral = (type, name) => `${styleName(name)}: ${styleType(type)}`;
                const styleLiteralArgs = (type, name, args) => `${styleName(name)}: ${styleType(type)}${styleArgs(args)}`;
                const styleLiteralValue = (type, name, value) => {
                    if (is.string(value)) {
                        value = `"${value}"`;
                    }

                    return `${styleName(name)}: ${styleType(type)} = {blue-fg}${value}{/blue-fg}`;
                };

                const list = [];
                for (let [key, value] of util.entries(ns, { onlyEnumerable: false, all: opts.has("all") })) {
                    const origType = meta.typeOf(value);
                    let type = origType;

                    switch (type) {
                        case "function": {
                            try {
                                const result = adone.js.parseFunction(value);
                                type = "";
                                if (result.isAsync) {
                                    type += "async ";
                                }
                                if (!result.isArrow) {
                                    type += "function ";
                                }

                                value = result.args;
                            } catch (err) {
                                if (value.toString().includes("[native code]")) {
                                    type = "native function ";
                                } else {
                                    type = "function ";
                                }

                                value = [];
                            }
                            break;
                        }
                        case "Object": {
                            if (is.class(value.constructor)) {
                                type = value.constructor.name;
                            } else {
                                type = "object ";
                            }
                            break;
                        }
                    }

                    list.push({
                        origType,
                        type,
                        key,
                        value
                    });
                }

                list.sort((a, b) => {
                    if (a.key < b.key) {
                        return -1;
                    } else if (a.key > b.key) {
                        return 1;
                    }
                    return 0;
                });

                term.print(`${styleType("namespace")} ${styleName(namespace)}\n`);
                for (const { origType, type, key, value } of list) {
                    term.print("    ");
                    switch (origType) {
                        case "string": {
                            term.print(`${styleLiteralValue(type, key, value)} {italic}{grey-fg}(${value.length}){/grey-fg}{/italic}`);
                            break;
                        }
                        case "number":
                        case "boolean":
                            term.print(`${styleLiteralValue(type, key, value)}`);
                            break;
                        case "function": {
                            term.print(styleLiteralArgs(type, key, value));
                            break;
                        }
                        case "class": {
                            term.print(styleLiteral(type, key));
                            break;
                        }
                        case "namespace": {
                            term.print(styleLiteral(type, key));
                            break;
                        }
                        case "Object": {
                            term.print(styleLiteral(type, key));
                            break;
                        }
                        default:
                            term.print(styleLiteral(type, key));
                    }
                    term.print("\n");
                }
                // console.log(meta.inspect(ns, inspectOptions));
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
                const type = meta.typeOf(obj);

                let result;
                const showValue = opts.has("value");
                switch (type) {
                    case "function":
                    case "class":
                        result = showValue
                            ? adone.js.highlight(obj.toString())
                            : meta.inspect(get(ns, objectPath), {
                                ...inspectOptions,
                                asObject: opts.has("object")
                            });
                        break;
                    default:
                        result = showValue
                            ? obj
                            : meta.inspect(get(ns, objectPath), inspectOptions);
                }

                console.log(result);
            }

            return 0;
        } catch (err) {
            console.log(pretty.error(err));
            return 1;
        }
    }
}
