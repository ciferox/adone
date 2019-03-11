const { is } = adone;

/**
 * TODO: some things are taken from adone.js.compiler.codeFrame, genrealize it?
 */

const BRACKET = /^[()\[\]{}]$/;
const NEWLINE = /\r\n|[\n\r\u2028\u2029]/;

const getTokenType = (match) => {
    const token = adone.js.tokens.matchToToken(match);

    if (token.type === "name") {
        // todo: es7?
        if (adone.js.compiler.esutils.keyword.isReservedWordES6(token.value) || token.value === "async") {
            return "keyword";
        }

        if (token.value[0] !== token.value[0].toLowerCase()) {
            return "capitalized";
        }
    }

    if (token.type === "punctuator" && BRACKET.test(token.value)) {
        // TODO: the output wrong for some reason
        // const { value } = token;
        // if (value === "[" || value === "]") {
        //     return "square.bracket";
        // }
        // if (value === "{" || value === "}") {
        //     return "curly.bracket";
        // }
        return "bracket";
    }

    if (
        token.type === "invalid" &&
        (token.value === "@" || token.value === "#")
    ) {
        return "punctuator";
    }

    return token.type;
};

class Differ extends adone.event.Emitter {
    diff(actual, expected, key) {
        if (actual === expected) {
            this.emit("element", "old", actual, key);
            return;
        }
        const aType = adone.typeOf(actual);
        const bType = adone.typeOf(expected);

        if (aType !== bType) {
            this.emit("element", "delete", actual, key);
            this.emit("element", "add", expected, key);
            return;
        }

        const handleArray = (actual, expected) => {
            const diff = adone.diff.arrays(actual, expected, {
                comparator: (a, b) => adone.is.deepEqual(a, b)
            }).reduce((res, curr) => {
                const action = curr.removed
                    ? "delete"
                    : curr.added
                        ? "add"
                        : "old";

                if (res.length === 0) {
                    for (const i of curr.value) {
                        res.push({ action, value: i });
                    }
                    return res;
                }
                const prev = res[res.length - 1];

                const first = curr.value.shift();

                if (adone.typeOf(prev.value) === adone.typeOf(first)) {
                    if (prev.action === "delete" && action === "add") {
                        res.pop();
                        res.push({
                            action: "diff",
                            actual: prev.value,
                            expected: first
                        });
                    } else if (prev.action === "add" && action === "delete") {
                        res.pop();
                        res.push({
                            action: "diff",
                            actual: curr.value,
                            expected: first
                        });
                    } else {
                        res.push({ action, value: first });
                    }
                } else {
                    res.push({ action, value: first });
                }

                for (const i of curr.value) {
                    res.push({ action, value: i });
                }

                return res;
            }, []);

            for (const p of diff) {
                if (p.action === "diff") {
                    this.diff(p.actual, p.expected);
                } else {
                    this.emit("element", p.action, p.value);
                }
            }
        };

        switch (aType) {
            case "Array": {
                this.emit("enter", "array", key);

                handleArray(actual, expected);

                this.emit("exit", "array");
                break;
            }
            case "string": {
                const diff = adone.diff.chars(actual, expected);
                const mask = {
                    delete: [],
                    add: []
                };
                let actualPos = 0;
                let expectedPos = 0;
                for (const i of diff) {
                    if (i.removed) {
                        mask.delete.push({ start: actualPos, end: actualPos + i.value.length, action: "delete" });
                        actualPos += i.value.length;
                    } else if (i.added) {
                        mask.add.push({ start: expectedPos, end: expectedPos + i.value.length, action: "add" });
                        expectedPos += i.value.length;
                    } else {
                        mask.delete.push({ start: actualPos, end: actualPos + i.value.length });
                        mask.add.push({ start: expectedPos, end: expectedPos + i.value.length });
                        actualPos += i.value.length;
                        expectedPos += i.value.length;
                    }
                }
                this.emit("element", "delete", actual, key, mask.delete);
                this.emit("element", "add", expected, key, mask.add);
                break;
            }
            case "Map": {
                this.emit("enter", "map");
                const actualKeys = [...actual.keys()];
                const expectedKeys = [...expected.keys()];
                const allKeys = adone.util.unique([...actualKeys, ...expectedKeys]).sort();
                for (const key of allKeys) {
                    if (!expected.has(key)) {
                        this.emit("element", "delete", actual.get(key), key);
                    } else if (!actual.has(key)) {
                        this.emit("element", "add", expected.get(key), key);
                    } else {
                        this.diff(actual.get(key), expected.get(key), key);
                    }
                }
                this.emit("exit", "map");
                break;
            }
            case "Set": {
                this.emit("enter", "set");

                // is sort good for it?
                handleArray([...actual].sort(), [...expected].sort());

                this.emit("exit", "set");
                break;
            }
            case "ArrayBuffer": {
                // compare it like uint8arrays
                this.emit("enter", "arrayBuffer");

                handleArray([...new Uint8Array(actual)], [...new Uint8Array(expected)]);

                this.emit("exit", "arrayBuffer");
                break;
            }
            case "Object": {
                // if (adone.is.plainObject(actual) && adone.is.plainObject(expected)) {
                this.emit("enter", "object", key);
                const actualKeys = Object.keys(actual);
                const expectedKeys = Object.keys(expected);
                const allKeys = adone.util.unique([...actualKeys, ...expectedKeys]).sort();
                for (const key of allKeys) {
                    if (!(key in expected)) {
                        this.emit("element", "delete", actual[key], key);
                    } else if (!(key in actual)) {
                        this.emit("element", "add", expected[key], key);
                    } else {
                        this.diff(actual[key], expected[key], key);
                    }
                }
                this.emit("exit", "object");
                break;
                // }
            }
            // fall through otherwise
            default: {
                if (!adone.is.deepEqual(actual, expected)) {
                    this.emit("element", "delete", actual, key);
                    this.emit("element", "add", expected, key);
                } else {
                    this.emit("element", "old", actual, key);
                }
            }
        }
    }
}

export const getDiff = (actual, expected) => {
    const differ = new Differ();

    const { chalk } = adone.cli;

    const colorizer = (obj, type) => {
        switch (type) {
            case "string":
                return chalk.green(obj);
            case "boolean":
            case "null":
            case "undefined":
            case "number":
                return chalk.yellow(obj);
            case "curly.bracket":
            case "square.bracket":
            case "angle.bracket":
                return chalk.dim(obj);
            case "class.name":
                return chalk.magenta(obj);
            case "name":
                return chalk.cyan(obj);
            case "regex": {
                let src;
                let flags;
                if (is.regexp(obj)) {
                    src = obj.source;
                    flags = obj.flags;
                } else {
                    const match = obj.match(/^\/(.+)\/([gimuy]*)$/);
                    src = match[1];
                    flags = match[2] || "";
                }
                return `${chalk.green("/")}${chalk.cyan(src)}${chalk.green("/")}${chalk.magenta(flags)}`;
            }
            case "comment":
                return chalk.dim(obj);
            case "keyword":
                return chalk.cyan(obj);
            default:
                return obj;
        }
    };

    const applyMask = (str, type, mask) => {
        let result = "";

        if (mask.length === 1 && mask[0].end - mask[0].start === str.length) {
            // do not apply the mask if it includes the entire string
            // just show the regular diff
            return str;
        }

        let maskLength = 0;
        for (const { action, start, end } of mask) {
            if (action === "add" || action === "delete") {
                maskLength += end - start;
            }
        }

        if (maskLength > str.length / 3) {
            return str;
        }

        for (const { action, start, end } of mask) {
            const part = str.slice(start, end);
            switch (action) {
                case "delete": {
                    result += chalk.bgRed.white(part);
                    break;
                }
                case "add": {
                    result += chalk.bgGreen.black(part);
                    break;
                }
                default: {
                    result += part;
                }
            }
        }
        return result;
    };

    const formatObjectKey = (key) => {
        if (!adone.is.identifier(key)) {
            return `${colorizer("[", "square.bracket")}${stringify(key)}${colorizer("]", "square.bracket")}`;
        }
        return colorizer(key, "object.key");
    };

    const circular = () => `${colorizer("[", "square.bracket")}${chalk.cyan("Circular")}${colorizer("]", "square.bracket")}`;

    const MAX_DEPTH = 3; // todo: customize it

    const stringify = (obj, level = 0, stack = []) => {
        const type = adone.typeOf(obj);

        const indent = (level) => "    ".repeat(level);

        const handlePlainObject = (obj) => {
            const keys = Object.keys(obj);
            if (keys.length === 0) {
                return `${colorizer("{", "curly.bracket")}${colorizer("}", "curly.bracket")}`;
            }
            let result = `${colorizer("{", "curly.bracket")}\n`;
            for (let i = 0; i < keys.length; ++i) {
                const key = keys[i];
                if (stack.includes(obj[key])) {
                    result += `${indent(level + 1)}${formatObjectKey(key)}: ${circular()}${i === keys.length - 1 ? "" : ","}\n`;
                } else {
                    stack.push(obj[key]);
                    result += `${indent(level + 1)}${formatObjectKey(key)}: ${stringify(obj[key], level + 1, stack)}${i === keys.length - 1 ? "" : ","}\n`;
                    stack.pop();
                }
            }
            result += `${indent(level)}${colorizer("}", "curly.bracket")}`;
            return result;
        };

        // if (level === MAX_DEPTH) {
        //     return `${colorizer("[", "square.bracket")}${chalk.cyan("DEPTH LIMIT")}${colorizer("]", "square.bracket")}`;
        // }

        switch (type) {
            case "Array": {
                if (obj.length === 0) {
                    return `${colorizer("[", "square.bracket")}${colorizer("]", "square.bracket")}`;
                }
                let result = `${colorizer("[", "square.bracket")}\n`;
                for (let i = 0; i < obj.length; ++i) {
                    if (i > 0) {
                        result += ",\n";
                    }
                    if (stack.includes(obj[i])) {
                        result += `${indent(level + 1)}${circular()}`;
                    } else {
                        stack.push(obj[i]);
                        result += `${indent(level + 1)}${stringify(obj[i], level + 1, stack)}`;
                        stack.pop();
                    }
                }
                result += `\n${indent(level)}${colorizer("]", "square.bracket")}`;
                return result;
            }
            case "ArrayBuffer": {
                if (obj.byteLength === 0) {
                    return `${
                        colorizer("ArrayBuffer", "class.name")
                        } ${
                        colorizer("{", "curly.bracket")
                        }${
                        colorizer("}", "curly.bracket")
                        }`;
                }
                let result = `${
                    colorizer("ArrayBuffer", "class.name")
                    } as ${
                    colorizer("Uint8Array", "class.name")
                    } ${
                    colorizer("{", "curly.bracket")
                    }\n`;
                const view = new Uint8Array(obj);
                for (let i = 0; i < view.length; ++i) {
                    const byte = `0x${view[i].toString(16).padStart(2, "0").toUpperCase()}`;
                    result += `${indent(level + 1)}${colorizer(byte, "number")}${i === view.length - 1 ? "" : ", "}\n`;
                }
                result += `${indent(level)}${colorizer("}", "curly.bracket")}`;
                return result;
            }
            case "Object": {
                if (adone.is.plainObject(obj)) {
                    return handlePlainObject(obj);
                }
                if (obj.inspect) {
                    return adone.text.indent(obj.inspect(), level * 4);
                }
                if (obj.constructor) {
                    return `${
                        colorizer("[", "square.bracket")
                        }${chalk.cyan("instance of")} ${colorizer(obj.constructor.name, "class.name")}${
                        colorizer("]", "square.bracket")
                        }`;
                    // } ${handlePlainObject(obj)}`;
                }
                return obj.toString();
            }
            case "string": {
                let res;
                // TODO: control chars?
                if (obj.includes('"')) {
                    if (obj.includes("'")) {
                        res = `'${obj.replace(/'/g, "\\'")}'`;
                    } else {
                        res = `'${obj}'`;
                    }
                }
                res = `"${obj}"`;

                return colorizer(res, "string");
            }
            case "boolean":
            case "null":
            case "undefined":
            case "number": {
                return colorizer(obj, "number");
            }
            case "Map": {
                if (obj.size === 0) {
                    return `${colorizer("Map", "class.name")} ${colorizer("{", "curly.bracket")}${colorizer("}", "curly.bracket")}`;
                }
                let result = `${colorizer("Map", "class.name")} ${colorizer("{", "curly.bracket")}\n`;
                let i = 0;
                for (const [k, v] of obj.entries()) {
                    if (i++ > 0) {
                        result += ",\n";
                    }
                    result += `${indent(level + 1)}${stringify(k, level + 1)} => ${stringify(v, level + 1)}`;
                }
                result += `\n${indent(level)}${colorizer("}", "curly.bracket")}`;
                return result;
            }
            case "Set": {
                if (obj.size === 0) {
                    return `${colorizer("Set", "class.name")} ${colorizer("{", "curly.bracket")}${colorizer("}", "curly.bracket")}`;
                }
                let result = `${colorizer("Set", "class.name")} ${colorizer("{", "curly.bracket")}\n`;
                let i = 0;
                for (const v of obj.values()) {
                    if (i++ > 0) {
                        result += ",\n";
                    }
                    result += `${indent(level + 1)}${stringify(v, level + 1)}`;
                }
                result += `\n${indent(level)}${colorizer("}", "curly.bracket")}`;
                return result;
            }
            case "WeakSet":
            case "WeakMap":
                return `${colorizer(type, "class.name")} {}`;
            case "RegExp": {
                return colorizer(obj, "regex");
            }
            case "Buffer": {
                const contents = obj.length > 20
                    ? obj.slice(0, 20)
                    : obj;

                return `${
                    colorizer("<", "angle.bracket")
                    }${
                    colorizer("Buffer ", "class.name")
                    }${
                    [...contents].map((x) => colorizer(x.toString(16).padStart(2, "0"), "number")).join(" ")
                    }${
                    contents.length < obj.length
                        ? ` ${chalk.dim("...")} `
                        : ""
                    }${
                    colorizer(">", "angle.bracket")
                    }`;
            }
            case "symbol": {
                return `${colorizer("Symbol", "class.name")}(${obj.toString().slice(7, -1)})`;
            }
            case "function": {
                return `${
                    colorizer("[", "square.bracket")
                    }${
                    colorizer(
                        is.generatorFunction(obj)
                            ? "GeneratorFunction" // TODO: async genrators
                            : is.asyncFunction(obj)
                                ? "AsyncFunction"
                                : "Function",
                        "class.name"
                    )
                    }${
                    obj.name
                        ? `: ${colorizer(obj.name, "name")}`
                        : ""
                    }${
                    colorizer("]", "square.bracket")
                    }`;
                // let { code } = adone.js.compiler.core.transform(`const a = ${obj.toString()}`, {
                //     plugins: [({ types: t }) => ({
                //         visitor: {
                //             FunctionExpression(path) {
                //                 path.node.body.body = [];
                //             },
                //             ArrowFunctionExpression(path) {
                //                 if (path.node.body.type === "BlockStatement") {
                //                     path.node.body.body = [];
                //                 } else {
                //                     path.node.body = t.blockStatement([]);
                //                 }
                //             }
                //         }
                //     })],
                //     generatorOpts: {
                //         comments: false,
                //         compact: false,
                //         quotes: "double",
                //         retainFunctionParens: true
                //     }
                // });
                // code = code.slice(10, -1).replace(adone.js.tokens.regex, (...args) => {
                //     const type = getTokenType(args);
                //     return args[0]
                //         .split(NEWLINE)
                //         .map((str) => colorizer(str, type))
                //         .join("\n");
                // });
                // return `${code.slice(0, -3)} { ... }`;
            }
            case "class": {
                return `${colorizer("[", "square.bracket")}${colorizer(`class ${obj.name}`, "class.name")}${colorizer("]", "square.bracket")}`;
            }
            default: {
                return obj.toString();
            }
        }

    };

    let result = "";
    let level = 0;

    const indent = () => "    ".repeat(level);

    const stack = new adone.collection.Stack();

    stack.push({
        type: "imaginary",
        firstElement: true
    });

    differ.on("enter", (type, key) => {
        const state = { type };
        if (stack.length > 1) {
            if (!stack.top.firstElement) {
                result += ",";
            }
            stack.top.firstElement = false;
            result += `\n${indent()}`;
            if (key) {
                switch (stack.top.type) {
                    case "object":
                        result += `${formatObjectKey(key)}: `;
                        break;
                    case "map":
                        result += `${stringify(key)} => `;
                        break;
                }
            }
        }
        state.firstElement = true;
        switch (type) {
            case "array": {
                result += colorizer("[", "square.bracket");
                break;
            }
            case "object": {
                result += colorizer("{", "curly.bracket");
                break;
            }
            case "map": {
                result += `${colorizer("Map", "class.name")} ${colorizer("{", "curly.bracket")}`;
                break;
            }
            case "set": {
                result += `${colorizer("Set", "class.name")} ${colorizer("{", "curly.bracket")}`;
                break;
            }
            case "arrayBuffer": {
                result += `${colorizer("ArrayBuffer", "class.name")} as ${colorizer("Uint8Array", "class.name")} ${colorizer("{", "curly.bracket")}`;
            }
        }
        ++level;
        stack.push(state);
    }).on("exit", (type) => {
        --level;
        if (!stack.top.firstElement) {
            // there was at least 1 element
            result += `\n${indent()}`;
        }
        switch (type) {
            case "array": {
                result += colorizer("]", "square.bracket");
                break;
            }
            case "map":
            case "set":
            case "arrayBuffer":
            case "object": {
                result += colorizer("}", "curly.bracket");
                break;
            }
        }
        stack.pop();
    }).on("element", (type, val, key, mask) => {
        if (stack.length === 1) {
            // only imaginary
            if (!stack.top.firstElement) {
                result += "\n";
            }
        } else {
            // inside some object
            if (!stack.top.firstElement) {
                result += ",";
            }
            result += "\n";
        }
        stack.top.firstElement = false;
        let marker;

        switch (type) {
            case "delete":
                marker = `${chalk.red("-")} `;
                break;
            case "add":
                marker = `${chalk.green("+")} `;
                break;
            default:
                marker = "";
        }

        let k = "";

        if (key) {
            switch (stack.top.type) {
                case "object":
                    k = `${formatObjectKey(key)}: `;
                    break;
                case "map":
                    k = `${stringify(key)} => `;
                    break;
            }
        }

        let i = indent();
        if (marker.endsWith(" ") && i.length > 1) {
            i = i.slice(2); // correctly indent the marker, keep the value on its place
        }

        if (adone.is.string(val)) {
            result += `${i}${marker}${k}${mask ? stringify(applyMask(val, type, mask)) : colorizer(stringify(val), "string")}`;
        } else if (!stack.empty && stack.top.type === "arrayBuffer") {
            const byte = `0x${val.toString(16).padStart(2, "0").toUpperCase()}`;
            result += `${i}${marker}${colorizer(byte, "number")}`;
        } else {
            result += `${k}${stringify(val)}`.split("\n").map((x) => {
                return `${i}${marker}${x}`;
            }).join("\n");
        }
    });

    differ.diff(actual, expected);

    return result;
};
