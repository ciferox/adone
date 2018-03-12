const {
    is,
    application: {
        Subsystem,
        DMainCliCommand
    },
    runtime: { term }
} = adone;

const VIRTUAL_NAMESAPCES = [
    "global",
    "std",
    "dev",
    "vendor",
    "npm"
];

const ADONE_GLOBAL = ["adone", "global"];

export default class Inspection extends Subsystem {
    @DMainCliCommand({
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
                name: "--depth",
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
                adone.log("Possible keys:");
                adone.log(adone.pretty.json([...VIRTUAL_NAMESAPCES, "adone"].sort()));
                return 0;
            }

            const parts = name.split(".");
            let namespace;
            let objectName;

            // Reduce 'adone' + 'global' chain...
            while (parts.length > 1) {
                if (ADONE_GLOBAL.includes(parts[0]) && ADONE_GLOBAL.includes(parts[1])) {
                    parts.shift();
                    name = parts.join(".");
                } else {
                    break;
                }
            }

            const isVirtual = VIRTUAL_NAMESAPCES.includes(parts[0]);

            if (parts[0] === "adone" || isVirtual) {
                if (isVirtual && parts[0] !== "adone") {
                    name = `adone.${name}`;
                }
                const result = adone.meta.parseName(name);
                namespace = result.namespace;
                objectName = result.objectName;
            } else if (parts[0] in global) {
                namespace = "global";
                objectName = (parts.length === 1)
                    ? (parts[0] === "global" ? "" : parts[0])
                    : parts[0] === "global"
                        ? parts.slice(1).join(".")
                        : parts.slice().join(".");
            } else {
                throw new adone.error.Unknown(`Unknown key: ${name}`);
            }

            let ns;
            if (namespace === "global" || namespace === "") {
                ns = global;
            } else {
                ns = (namespace === "adone") ? adone : adone.lodash.get(adone, namespace.substring("adone".length + 1));
            }

            if (objectName === "") {
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
                    const origType = adone.meta.typeOf(value);
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
                // adone.log(adone.meta.inspect(ns, inspectOptions));
            } else if (adone.lodash.has(ns, objectName)) {
                const obj = adone.lodash.get(ns, objectName);
                const type = adone.meta.typeOf(obj);

                if (type === "function") {
                    adone.log(adone.js.highlight(obj.toString()));
                } else {
                    adone.log(adone.meta.inspect(adone.lodash.get(ns, objectName), inspectOptions));
                }
            } else {
                throw new adone.error.Unknown(`Unknown object: ${name}`);
            }

            return 0;
        } catch (err) {
            adone.logError(err.message);
            return 1;
        }
    }
}
