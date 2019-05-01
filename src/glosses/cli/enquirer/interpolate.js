

const colors = require("./ansi-colors");
const clean = (str = "") => {
    return is.string(str) ? str.replace(/^['"]|['"]$/g, "") : "";
};

/**
 * This file contains the interpolation and rendering logic for
 * the Snippet prompt.
 */

class Item {
    constructor(token) {
        this.name = token.key;
        this.field = token.field || {};
        this.value = clean(token.initial || this.field.initial || "");
        this.message = token.message || this.name;
        this.cursor = 0;
        this.input = "";
        this.lines = [];
    }
}

const tokenize = async (options = {}, defaults = {}, fn = (token) => token) => {
    const unique = new Set();
    const fields = options.fields || [];
    let input = options.template;
    const tabstops = [];
    const items = [];
    const keys = [];
    let line = 1;

    if (is.function(input)) {
        input = await input();
    }

    let i = -1;
    const next = () => input[++i];
    const peek = () => input[i + 1];
    const push = (token) => {
        token.line = line;
        tabstops.push(token);
    };

    push({ type: "bos", value: "" });

    while (i < input.length - 1) {
        let value = next();

        if (/^[^\S\n ]$/.test(value)) {
            push({ type: "text", value });
            continue;
        }

        if (value === "\n") {
            push({ type: "newline", value });
            line++;
            continue;
        }

        if (value === "\\") {
            value += next();
            push({ type: "text", value });
            continue;
        }

        if ((value === "$" || value === "#" || value === "{") && peek() === "{") {
            const n = next();
            value += n;

            let token = { type: "template", open: value, inner: "", close: "", value };
            let ch;

            while ((ch = next())) {
                if (ch === "}") {
                    if (peek() === "}") {
                        ch += next(); 
                    }
                    token.value += ch;
                    token.close = ch;
                    break;
                }

                if (ch === ":") {
                    token.initial = "";
                    token.key = token.inner;
                } else if (token.initial !== void 0) {
                    token.initial += ch;
                }

                token.value += ch;
                token.inner += ch;
            }

            token.template = token.open + (token.initial || token.inner) + token.close;
            token.key = token.key || token.inner;

            if (defaults.hasOwnProperty(token.key)) {
                token.initial = defaults[token.key];
            }

            token = fn(token);
            push(token);

            keys.push(token.key);
            unique.add(token.key);

            let item = items.find((item) => item.name === token.key);
            token.field = fields.find((ch) => ch.name === token.key);

            if (!item) {
                item = new Item(token);
                items.push(item);
            }

            item.lines.push(token.line - 1);
            continue;
        }

        const last = tabstops[tabstops.length - 1];
        if (last.type === "text" && last.line === line) {
            last.value += value;
        } else {
            push({ type: "text", value });
        }
    }

    push({ type: "eos", value: "" });
    return { input, tabstops, unique, keys, items };
};

module.exports = async (prompt) => {
    const options = prompt.options;
    const required = new Set(options.required === true ? [] : (options.required || []));
    const defaults = { ...options.values, ...options.initial };
    const { tabstops, items, keys } = await tokenize(options, defaults);

    const result = createFn("result", prompt, options);
    const format = createFn("format", prompt, options);
    const isValid = createFn("validate", prompt, options, true);
    const isVal = prompt.isValue.bind(prompt);

    return async (state = {}, submitted = false) => {
        let index = 0;

        state.required = required;
        state.items = items;
        state.keys = keys;
        state.output = "";

        const validate = async (value, state, item, index) => {
            const error = await isValid(value, state, item, index);
            if (error === false) {
                return `Invalid field ${item.name}`;
            }
            return error;
        };

        for (const token of tabstops) {
            let value = token.value;
            const key = token.key;

            if (token.type !== "template") {
                if (value) {
                    state.output += value; 
                }
                continue;
            }

            if (token.type === "template") {
                const item = items.find((ch) => ch.name === key);

                if (options.required === true) {
                    state.required.add(item.name);
                }

                let val = [item.input, state.values[item.value], item.value, value].find(isVal);
                const field = item.field || {};
                const message = field.message || token.inner;

                if (submitted) {
                    const error = await validate(state.values[key], state, item, index);
                    if ((error && is.string(error)) || error === false) {
                        state.invalid.set(key, error);
                        continue;
                    }

                    state.invalid.delete(key);
                    const res = await result(state.values[key], state, item, index);
                    state.output += colors.unstyle(res);
                    continue;
                }

                item.placeholder = false;

                const before = value;
                value = await format(value, state, item, index);

                if (val !== value) {
                    state.values[key] = val;
                    value = prompt.styles.typing(val);
                    state.missing.delete(message);

                } else {
                    state.values[key] = void 0;
                    val = `<${message}>`;
                    value = prompt.styles.primary(val);
                    item.placeholder = true;

                    if (state.required.has(key)) {
                        state.missing.add(message);
                    }
                }

                if (state.missing.has(message) && state.validating) {
                    value = prompt.styles.warning(val);
                }

                if (state.invalid.has(key) && state.validating) {
                    value = prompt.styles.danger(val);
                }

                if (index === state.index) {
                    if (before !== value) {
                        value = prompt.styles.underline(value);
                    } else {
                        value = prompt.styles.heading(colors.unstyle(value));
                    }
                }

                index++;
            }

            if (value) {
                state.output += value;
            }
        }

        const lines = state.output.split("\n").map((l) => ` ${l}`);
        const len = items.length;
        let done = 0;

        for (const item of items) {
            if (state.invalid.has(item.name)) {
                item.lines.forEach((i) => {
                    if (lines[i][0] !== " ") {
                        return; 
                    }
                    lines[i] = state.styles.danger(state.symbols.bullet) + lines[i].slice(1);
                });
            }

            if (prompt.isValue(state.values[item.name])) {
                done++;
            }
        }

        state.completed = ((done / len) * 100).toFixed(0);
        state.output = lines.join("\n");
        return state.output;
    };
};

function createFn(prop, prompt, options, fallback) {
    return (value, state, item, index) => {
        if (is.function(item.field[prop])) {
            return item.field[prop].call(prompt, value, state, item, index);
        }
        return [fallback, value].find((v) => prompt.isValue(v));
    };
}
