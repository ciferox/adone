

const Prompt = require("../prompt");
const { isPrimitive, hasColor } = require("../utils");

class BooleanPrompt extends Prompt {
    constructor(options) {
        super(options);
        this.cursorHide();
    }

    async initialize() {
        const initial = await this.resolve(this.initial, this.state);
        this.input = await this.cast(initial);
        await super.initialize();
    }

    dispatch(ch) {
        if (!this.isValue(ch)) {
            return this.alert(); 
        }
        this.input = ch;
        return this.submit();
    }

    format(value) {
        const { styles, state } = this;
        return !state.submitted ? styles.primary(value) : styles.success(value);
    }

    cast(input) {
        return this.isTrue(input);
    }

    isTrue(input) {
        return /^[ty1]/i.test(input);
    }

    isFalse(input) {
        return /^[fn0]/i.test(input);
    }

    isValue(value) {
        return isPrimitive(value) && (this.isTrue(value) || this.isFalse(value));
    }

    async hint() {
        if (this.state.status === "pending") {
            const hint = await this.element("hint");
            if (!hasColor(hint)) {
                return this.styles.muted(hint);
            }
            return hint;
        }
    }

    async render() {
        const { input, size } = this.state;

        const prefix = await this.prefix();
        const sep = await this.separator();
        const msg = await this.message();
        const hint = this.styles.muted(this.default);

        let promptLine = [prefix, msg, hint, sep].filter(Boolean).join(" ");
        this.state.prompt = promptLine;

        const header = await this.header();
        const value = this.value = this.cast(input);
        let output = await this.format(value);
        const help = (await this.error()) || (await this.hint());
        const footer = await this.footer();

        if (help && !promptLine.includes(help)) {
            output += ` ${help}`; 
        }
        promptLine += ` ${output}`;

        this.clear(size);
        this.write([header, promptLine, footer].filter(Boolean).join("\n"));
        this.restore();
    }

    set value(value) {
        super.value = value;
    }

    get value() {
        return this.cast(super.value);
    }
}

module.exports = BooleanPrompt;
