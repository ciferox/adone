const {
    is
} = adone;

const Prompt = require("../prompt");
const placeholder = require("../placeholder");
const { isPrimitive } = require("../utils");

class StringPrompt extends Prompt {
    constructor(options) {
        super(options);
        this.initial = isPrimitive(this.initial) ? String(this.initial) : "";
        if (this.initial) {
            this.cursorHide(); 
        }
        this.state.prevCursor = 0;
        this.state.clipboard = [];
    }

    async keypress(input, key = {}) {
        const prev = this.state.prevKeypress;
        this.state.prevKeypress = key;
        if (this.options.multiline === true && key.name === "return") {
            if (!prev || prev.name !== "return") {
                return this.append("\n", key);
            }
        }
        return super.keypress(input, key);
    }

    moveCursor(n) {
        this.cursor += n;
    }

    reset() {
        this.input = this.value = "";
        this.cursor = 0;
        return this.render();
    }

    dispatch(ch, key) {
        if (!ch || key.ctrl || key.code) {
            return this.alert(); 
        }
        this.append(ch);
    }

    append(ch) {
        const { cursor, input } = this.state;
        this.input = `${input}`.slice(0, cursor) + ch + `${input}`.slice(cursor);
        this.moveCursor(String(ch).length);
        this.render();
    }

    insert(str) {
        this.append(str);
    }

    delete() {
        const { cursor, input } = this.state;
        if (cursor <= 0) {
            return this.alert(); 
        }
        this.input = `${input}`.slice(0, cursor - 1) + `${input}`.slice(cursor);
        this.moveCursor(-1);
        this.render();
    }

    deleteForward() {
        const { cursor, input } = this.state;
        if (input[cursor] === void 0) {
            return this.alert(); 
        }
        this.input = `${input}`.slice(0, cursor) + `${input}`.slice(cursor + 1);
        this.render();
    }

    cutForward() {
        const pos = this.cursor;
        if (this.input.length <= pos) {
            return this.alert(); 
        }
        this.state.clipboard.push(this.input.slice(pos));
        this.input = this.input.slice(0, pos);
        this.render();
    }

    cutLeft() {
        const pos = this.cursor;
        if (pos === 0) {
            return this.alert(); 
        }
        const before = this.input.slice(0, pos);
        const after = this.input.slice(pos);
        const words = before.split(" ");
        this.state.clipboard.push(words.pop());
        this.input = words.join(" ");
        this.cursor = this.input.length;
        this.input += after;
        this.render();
    }

    paste() {
        if (!this.state.clipboard.length) {
            return this.alert(); 
        }
        this.insert(this.state.clipboard.pop());
        this.render();
    }

    toggleCursor() {
        if (this.state.prevCursor) {
            this.cursor = this.state.prevCursor;
            this.state.prevCursor = 0;
        } else {
            this.state.prevCursor = this.cursor;
            this.cursor = 0;
        }
        this.render();
    }

    first() {
        this.cursor = 0;
        this.render();
    }

    last() {
        this.cursor = this.input.length - 1;
        this.render();
    }

    next() {
        const init = !is.nil(this.initial) ? String(this.initial) : "";
        if (!init || !init.startsWith(this.input)) {
            return this.alert(); 
        }
        this.input = this.initial;
        this.cursor = this.initial.length;
        this.render();
    }

    prev() {
        if (!this.input) {
            return this.alert(); 
        }
        this.reset();
    }

    backward() {
        return this.left();
    }

    forward() {
        return this.right();
    }

    right() {
        if (this.cursor >= this.input.length) {
            return this.alert(); 
        }
        this.moveCursor(1);
        return this.render();
    }

    left() {
        if (this.cursor <= 0) {
            return this.alert(); 
        }
        this.moveCursor(-1);
        return this.render();
    }

    isValue(value) {
        return Boolean(value);
    }

    async format(input = this.value) {
        const initial = await this.resolve(this.initial, this.state);
        if (!this.state.submitted) {
            return placeholder(this, { input, initial, pos: this.cursor });
        }
        return this.styles.submitted(input || initial);
    }

    async render() {
        const size = this.state.size;

        const prefix = await this.prefix();
        const separator = await this.separator();
        const message = await this.message();

        let prompt = [prefix, message, separator].filter(Boolean).join(" ");
        this.state.prompt = prompt;

        const header = await this.header();
        let output = await this.format();
        const help = (await this.error()) || (await this.hint());
        const footer = await this.footer();

        if (help && !output.includes(help)) {
            output += ` ${help}`; 
        }
        prompt += ` ${output}`;

        this.clear(size);
        this.write([header, prompt, footer].filter(Boolean).join("\n"));
        this.restore();
    }
}

module.exports = StringPrompt;
