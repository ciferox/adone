

const colors = require("./ansi-colors");
const ArrayPrompt = require("../types/array");
const utils = require("../utils");

class LikertScale extends ArrayPrompt {
    constructor(options = {}) {
        super(options);
        this.widths = [].concat(options.messageWidth || 50);
        this.align = [].concat(options.align || "left");
        this.linebreak = options.linebreak || false;
        this.edgeLength = options.edgeLength || 3;
        this.newline = options.newline || "\n   ";
        const start = options.startNumber || 1;
        if (is.number(this.scale)) {
            this.scaleKey = false;
            this.scale = Array(this.scale).fill(0).map((v, i) => ({ name: i + start }));
        }
    }

    async reset() {
        this.tableized = false;
        await super.reset();
        return this.render();
    }

    tableize() {
        if (this.tableized === true) {
            return; 
        }
        this.tableized = true;
        let longest = 0;

        for (const ch of this.choices) {
            longest = Math.max(longest, ch.message.length);
            ch.scaleIndex = ch.initial || 2;
            ch.scale = [];

            for (let i = 0; i < this.scale.length; i++) {
                ch.scale.push({ index: i });
            }
        }
        this.widths[0] = Math.min(this.widths[0], longest + 3);
    }

    async dispatch(s, key) {
        if (this.multiple) {
            return this[key.name] ? await this[key.name](s, key) : await super.dispatch(s, key);
        }
        this.alert();
    }

    heading(msg, item, i) {
        return this.styles.strong(msg);
    }

    separator() {
        return this.styles.muted(this.symbols.ellipsis);
    }

    right() {
        const choice = this.focused;
        if (choice.scaleIndex >= this.scale.length - 1) {
            return this.alert(); 
        }
        choice.scaleIndex++;
        return this.render();
    }

    left() {
        const choice = this.focused;
        if (choice.scaleIndex <= 0) {
            return this.alert(); 
        }
        choice.scaleIndex--;
        return this.render();
    }

    indent() {
        return "";
    }

    format() {
        if (this.state.submitted) {
            const values = this.choices.map((ch) => this.styles.info(ch.index));
            return values.join(", ");
        }
        return "";
    }

    pointer() {
        return "";
    }

    /**
     * Render the scale "Key". Something like:
     * @return {String}
     */

    renderScaleKey() {
        if (this.scaleKey === false) {
            return ""; 
        }
        if (this.state.submitted) {
            return ""; 
        }
        const scale = this.scale.map((item) => `   ${item.name} - ${item.message}`);
        const key = ["", ...scale].map((item) => this.styles.muted(item));
        return key.join("\n");
    }

    /**
     * Render the heading row for the scale.
     * @return {String}
     */

    renderScaleHeading(max) {
        let keys = this.scale.map((ele) => ele.name);
        if (is.function(this.options.renderScaleHeading)) {
            keys = this.options.renderScaleHeading.call(this, max);
        }
        const diff = this.scaleLength - keys.join("").length;
        const spacing = Math.round(diff / (keys.length - 1));
        const names = keys.map((key) => this.styles.strong(key));
        const headings = names.join(" ".repeat(spacing));
        const padding = " ".repeat(this.widths[0]);
        return this.margin[3] + padding + this.margin[1] + headings;
    }

    /**
     * Render a scale indicator => ◯ or ◉ by default
     */

    scaleIndicator(choice, item, i) {
        if (is.function(this.options.scaleIndicator)) {
            return this.options.scaleIndicator.call(this, choice, item, i);
        }
        const enabled = choice.scaleIndex === item.index;
        if (item.disabled) {
            return this.styles.hint(this.symbols.radio.disabled); 
        }
        if (enabled) {
            return this.styles.success(this.symbols.radio.on); 
        }
        return this.symbols.radio.off;
    }

    /**
     * Render the actual scale => ◯────◯────◉────◯────◯
     */

    renderScale(choice, i) {
        const scale = choice.scale.map((item) => this.scaleIndicator(choice, item, i));
        const padding = this.term === "Hyper" ? "" : " ";
        return scale.join(padding + this.symbols.line.repeat(this.edgeLength));
    }

    /**
     * Render a choice, including scale =>
     *   "The website is easy to navigate. ◯───◯───◉───◯───◯"
     */

    async renderChoice(choice, i) {
        await this.onChoice(choice, i);

        const focused = this.index === i;
        const pointer = await this.pointer(choice, i);
        let hint = await choice.hint;

        if (hint && !utils.hasColor(hint)) {
            hint = this.styles.muted(hint);
        }

        const pad = (str) => this.margin[3] + str.replace(/\s+$/, "").padEnd(this.widths[0], " ");
        const newline = this.newline;
        const ind = this.indent(choice);
        const message = await this.resolve(choice.message, this.state, choice, i);
        let scale = await this.renderScale(choice, i);
        const margin = this.margin[1] + this.margin[3];
        this.scaleLength = colors.unstyle(scale).length;
        this.widths[0] = Math.min(this.widths[0], this.width - this.scaleLength - margin.length);
        const msg = utils.wordWrap(message, { width: this.widths[0], newline });
        let lines = msg.split("\n").map((line) => pad(line) + this.margin[1]);

        if (focused) {
            scale = this.styles.info(scale);
            lines = lines.map((line) => this.styles.info(line));
        }

        lines[0] += scale;

        if (this.linebreak) {
            lines.push(""); 
        }
        return [ind + pointer, lines.join("\n")].filter(Boolean);
    }

    async renderChoices() {
        if (this.state.submitted) {
            return ""; 
        }
        this.tableize();
        const choices = this.visible.map(async (ch, i) => await this.renderChoice(ch, i));
        const visible = await Promise.all(choices);
        const heading = await this.renderScaleHeading();
        return this.margin[0] + [heading, ...visible.map((v) => v.join(" "))].join("\n");
    }

    async render() {
        const { submitted, size } = this.state;

        const prefix = await this.prefix();
        const separator = await this.separator();
        const message = await this.message();

        let prompt = "";
        if (this.options.promptLine !== false) {
            prompt = [prefix, message, separator, ""].join(" ");
            this.state.prompt = prompt;
        }

        const header = await this.header();
        const output = await this.format();
        const key = await this.renderScaleKey();
        const help = await this.error() || await this.hint();
        const body = await this.renderChoices();
        const footer = await this.footer();
        const err = this.emptyError;

        if (output) {
            prompt += output; 
        }
        if (help && !prompt.includes(help)) {
            prompt += ` ${help}`; 
        }

        if (submitted && !output && !body.trim() && this.multiple && !is.nil(err)) {
            prompt += this.styles.danger(err);
        }

        this.clear(size);
        this.write([header, prompt, key, body, footer].filter(Boolean).join("\n"));
        if (!this.state.submitted) {
            this.write(this.margin[2]);
        }
        this.restore();
    }

    submit() {
        this.value = {};
        for (const choice of this.choices) {
            this.value[choice.name] = choice.scaleIndex;
        }
        return this.base.submit.call(this);
    }
}

module.exports = LikertScale;
