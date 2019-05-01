

const ArrayPrompt = require("../types/array");

class Survey extends ArrayPrompt {
    constructor(options = {}) {
        super(options);
        this.emptyError = options.emptyError || "No items were selected";
        this.term = process.env.TERM_PROGRAM;

        if (!this.options.header) {
            let header = ["", "4 - Strongly Agree", "3 - Agree", "2 - Neutral", "1 - Disagree", "0 - Strongly Disagree", ""];
            header = header.map((ele) => this.styles.muted(ele));
            this.state.header = header.join("\n   ");
        }
    }

    async toChoices(...args) {
        if (this.createdScales) {
            return false; 
        }
        this.createdScales = true;
        const choices = await super.toChoices(...args);
        for (const choice of choices) {
            choice.scale = createScale(5, this.options);
            choice.scaleIdx = 2;
        }
        return choices;
    }

    dispatch() {
        this.alert();
    }

    space() {
        const choice = this.focused;
        const ele = choice.scale[choice.scaleIdx];
        const selected = ele.selected;
        choice.scale.forEach((e) => (e.selected = false));
        ele.selected = !selected;
        return this.render();
    }

    indicator() {
        return "";
    }

    pointer() {
        return "";
    }

    separator() {
        return this.styles.muted(this.symbols.ellipsis);
    }

    right() {
        const choice = this.focused;
        if (choice.scaleIdx >= choice.scale.length - 1) {
            return this.alert(); 
        }
        choice.scaleIdx++;
        return this.render();
    }

    left() {
        const choice = this.focused;
        if (choice.scaleIdx <= 0) {
            return this.alert(); 
        }
        choice.scaleIdx--;
        return this.render();
    }

    indent() {
        return "   ";
    }

    async renderChoice(item, i) {
        await this.onChoice(item, i);
        const focused = this.index === i;
        const isHyper = this.term === "Hyper";
        const n = !isHyper ? 8 : 9;
        const s = !isHyper ? " " : "";
        const ln = this.symbols.line.repeat(n);
        const sp = " ".repeat(n + (isHyper ? 0 : 1));
        const dot = (enabled) => (enabled ? this.styles.success("◉") : "◯") + s;

        const num = `${i + 1}.`;
        const color = focused ? this.styles.heading : this.styles.noop;
        const msg = await this.resolve(item.message, this.state, item, i);
        const indent = this.indent(item);
        let scale = indent + item.scale.map((e, i) => dot(i === item.scaleIdx)).join(ln);
        const val = (i) => i === item.scaleIdx ? color(i) : i;
        let next = indent + item.scale.map((e, i) => val(i)).join(sp);

        const line = () => [num, msg].filter(Boolean).join(" ");
        const lines = () => [line(), scale, next, " "].filter(Boolean).join("\n");

        if (focused) {
            scale = this.styles.cyan(scale);
            next = this.styles.cyan(next);
        }

        return lines();
    }

    async renderChoices() {
        if (this.state.submitted) {
            return ""; 
        }
        const choices = this.visible.map(async (ch, i) => await this.renderChoice(ch, i));
        const visible = await Promise.all(choices);
        if (!visible.length) {
            visible.push(this.styles.danger("No matching choices")); 
        }
        return visible.join("\n");
    }

    format() {
        if (this.state.submitted) {
            const values = this.choices.map((ch) => this.styles.info(ch.scaleIdx));
            return values.join(", ");
        }
        return "";
    }

    async render() {
        const { submitted, size } = this.state;

        const prefix = await this.prefix();
        const separator = await this.separator();
        const message = await this.message();

        let prompt = [prefix, message, separator].filter(Boolean).join(" ");
        this.state.prompt = prompt;

        const header = await this.header();
        const output = await this.format();
        const help = await this.error() || await this.hint();
        const body = await this.renderChoices();
        const footer = await this.footer();

        if (output || !help) {
            prompt += ` ${output}`; 
        }
        if (help && !prompt.includes(help)) {
            prompt += ` ${help}`; 
        }

        if (submitted && !output && !body && this.multiple && this.type !== "form") {
            prompt += this.styles.danger(this.emptyError);
        }

        this.clear(size);
        this.write([prompt, header, body, footer].filter(Boolean).join("\n"));
        this.restore();
    }

    submit() {
        this.value = {};
        for (const choice of this.choices) {
            this.value[choice.name] = choice.scaleIdx;
        }
        return this.base.submit.call(this);
    }
}

function createScale(n, options = {}) {
    if (is.array(options.scale)) {
        return options.scale.map((ele) => ({ ...ele }));
    }
    const scale = [];
    for (let i = 1; i < n + 1; i++) {
        scale.push({ i, selected: false }); 
    }
    return scale;
}

module.exports = Survey;
