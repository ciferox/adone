

const colors = require("./ansi-colors");
const interpolate = require("../interpolate");
const Prompt = require("../prompt");

class SnippetPrompt extends Prompt {
    constructor(options) {
        super(options);
        this.cursorHide();
        this.reset(true);
    }

    async initialize() {
        this.interpolate = await interpolate(this);
        await super.initialize();
    }

    async reset(first) {
        this.state.keys = [];
        this.state.invalid = new Map();
        this.state.missing = new Set();
        this.state.completed = 0;
        this.state.values = {};

        if (first !== true) {
            await this.initialize();
            await this.render();
        }
    }

    moveCursor(n) {
        const item = this.getItem();
        this.cursor += n;
        item.cursor += n;
    }

    dispatch(ch, key) {
        if (!key.code && !key.ctrl && !is.nil(ch) && this.getItem()) {
            this.append(ch, key);
            return;
        }
        this.alert();
    }

    append(ch, key) {
        const item = this.getItem();
        const prefix = item.input.slice(0, this.cursor);
        const suffix = item.input.slice(this.cursor);
        this.input = item.input = `${prefix}${ch}${suffix}`;
        this.moveCursor(1);
        this.render();
    }

    delete() {
        const item = this.getItem();
        if (this.cursor <= 0 || !item.input) {
            return this.alert(); 
        }
        const suffix = item.input.slice(this.cursor);
        const prefix = item.input.slice(0, this.cursor - 1);
        this.input = item.input = `${prefix}${suffix}`;
        this.moveCursor(-1);
        this.render();
    }

    increment(i) {
        return i >= this.state.keys.length - 1 ? 0 : i + 1;
    }

    decrement(i) {
        return i <= 0 ? this.state.keys.length - 1 : i - 1;
    }

    first() {
        this.state.index = 0;
        this.render();
    }

    last() {
        this.state.index = this.state.keys.length - 1;
        this.render();
    }

    right() {
        if (this.cursor >= this.input.length) {
            return this.alert(); 
        }
        this.moveCursor(1);
        this.render();
    }

    left() {
        if (this.cursor <= 0) {
            return this.alert(); 
        }
        this.moveCursor(-1);
        this.render();
    }

    prev() {
        this.state.index = this.decrement(this.state.index);
        this.getItem();
        this.render();
    }

    next() {
        this.state.index = this.increment(this.state.index);
        this.getItem();
        this.render();
    }

    up() {
        this.prev();
    }

    down() {
        this.next();
    }

    format(value) {
        let color = this.state.completed < 100 ? this.styles.warning : this.styles.success;
        if (this.state.submitted === true && this.state.completed !== 100) {
            color = this.styles.danger;
        }
        return color(`${this.state.completed}% completed`);
    }

    async render() {
        const { index, keys = [], submitted, size } = this.state;

        const newline = [this.options.newline, "\n"].find((v) => !is.nil(v));
        const prefix = await this.prefix();
        const separator = await this.separator();
        const message = await this.message();

        let prompt = [prefix, message, separator].filter(Boolean).join(" ");
        this.state.prompt = prompt;

        const header = await this.header();
        const error = (await this.error()) || "";
        const hint = (await this.hint()) || "";
        const body = submitted ? "" : await this.interpolate(this.state);

        const key = this.state.key = keys[index] || "";
        const input = await this.format(key);
        const footer = await this.footer();
        if (input) {
            prompt += ` ${input}`; 
        }
        if (hint && !input && this.state.completed === 0) {
            prompt += ` ${hint}`; 
        }

        this.clear(size);
        const lines = [header, prompt, body, footer, error.trim()];
        this.write(lines.filter(Boolean).join(newline));
        this.restore();
    }

    getItem(name) {
        const { items, keys, index } = this.state;
        const item = items.find((ch) => ch.name === keys[index]);
        if (item && !is.nil(item.input)) {
            this.input = item.input;
            this.cursor = item.cursor;
        }
        return item;
    }

    async submit() {
        if (!is.function(this.interpolate)) {
            await this.initialize(); 
        }
        await this.interpolate(this.state, true);

        const { invalid, missing, output, values } = this.state;
        if (invalid.size) {
            let err = "";
            for (const [key, value] of invalid) {
                err += `Invalid ${key}: ${value}\n`; 
            }
            this.state.error = err;
            return super.submit();
        }

        if (missing.size) {
            this.state.error = `Required: ${[...missing.keys()].join(", ")}`;
            return super.submit();
        }

        const lines = colors.unstyle(output).split("\n");
        const result = lines.map((v) => v.slice(1)).join("\n");
        this.value = { values, result };
        return super.submit();
    }
}

module.exports = SnippetPrompt;