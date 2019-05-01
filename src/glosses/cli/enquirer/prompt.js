const {
    is
} = adone;

const Events = require("events");
const colors = require("ansi-colors");
const keypress = require("./keypress");
const timer = require("./timer");
const State = require("./state");
const theme = require("./theme");
const utils = require("./utils");
const ansi = require("./ansi");

/**
 * Base class for creating a new Prompt.
 * @param {Object} `options` Question object.
 */

class Prompt extends Events {
    constructor(options = {}) {
        super();
        this.name = options.name;
        this.type = options.type;
        this.options = options;
        theme(this);
        timer(this);
        this.state = new State(this);
        this.initial = [options.initial, options.default].find((v) => !is.nil(v));
        this.stdout = options.stdout || process.stdout;
        this.stdin = options.stdin || process.stdin;
        this.scale = options.scale || 1;
        this.term = this.options.term || process.env.TERM_PROGRAM;
        this.margin = margin(this.options.margin);
        this.setMaxListeners(0);
        setOptions(this);
    }

    async keypress(input, event = {}) {
        this.keypressed = true;
        const key = keypress.action(input, keypress(input, event), this.options.actions);
        this.state.keypress = key;
        this.emit("keypress", input, key);
        this.emit("state", this.state.clone());
        const fn = this.options[key.action] || this[key.action] || this.dispatch;
        if (is.function(fn)) {
            return fn.call(this, input, key);
        }
        this.alert();
    }

    alert() {
        delete this.state.alert;
        if (this.options.show === false) {
            this.emit("alert");
        } else {
            this.stdout.write(ansi.code.beep);
        }
    }

    cursorHide() {
        this.stdout.write(ansi.cursor.hide());
        utils.onExit(() => this.cursorShow());
    }

    cursorShow() {
        this.stdout.write(ansi.cursor.show());
    }

    write(str) {
        if (!str) {
            return; 
        }
        if (this.stdout && this.state.show !== false) {
            this.stdout.write(str);
        }
        this.state.buffer += str;
    }

    clear(lines = 0) {
        const buffer = this.state.buffer;
        this.state.buffer = "";
        if ((!buffer && !lines) || this.options.show === false) {
            return; 
        }
        this.stdout.write(ansi.cursor.down(lines) + ansi.clear(buffer, this.width));
    }

    restore() {
        if (this.state.closed || this.options.show === false) {
            return; 
        }

        const { prompt, after, rest } = this.sections();
        const { cursor, initial = "", input = "", value = "" } = this;

        const size = this.state.size = rest.length;
        const state = { after, cursor, initial, input, prompt, size, value };
        const codes = ansi.cursor.restore(state);
        if (codes) {
            this.stdout.write(codes);
        }
    }

    sections() {
        let { buffer, input, prompt } = this.state;
        prompt = colors.unstyle(prompt);
        const buf = colors.unstyle(buffer);
        const idx = buf.indexOf(prompt);
        const header = buf.slice(0, idx);
        const rest = buf.slice(idx);
        const lines = rest.split("\n");
        const first = lines[0];
        const last = lines[lines.length - 1];
        const promptLine = prompt + (input ? ` ${input}` : "");
        const len = promptLine.length;
        const after = len < first.length ? first.slice(len + 1) : "";
        return { header, prompt: first, after, rest: lines.slice(1), last };
    }

    async submit() {
        this.state.submitted = true;
        this.state.validating = true;

        // this will only be called when the prompt is directly submitted
        // without initializing, i.e. when the prompt is skipped, etc. Otherwize,
        // "options.onSubmit" is will be handled by the "initialize()" method.
        if (this.options.onSubmit) {
            await this.options.onSubmit.call(this, this.name, this.value, this);
        }

        const result = this.state.error || await this.validate(this.value, this.state);
        if (result !== true) {
            let error = `\n${this.symbols.pointer} `;

            if (is.string(result)) {
                error += result.trim();
            } else {
                error += "Invalid input";
            }

            this.state.error = `\n${this.styles.danger(error)}`;
            this.state.submitted = false;
            await this.render();
            await this.alert();
            this.state.validating = false;
            this.state.error = void 0;
            return;
        }

        this.state.validating = false;
        await this.render();
        await this.close();

        this.value = await this.result(this.value);
        this.emit("submit", this.value);
    }

    async cancel(err) {
        this.state.cancelled = this.state.submitted = true;

        await this.render();
        await this.close();

        if (is.function(this.options.onCancel)) {
            await this.options.onCancel.call(this, this.name, this.value, this);
        }

        this.emit("cancel", await this.error(err));
    }

    async close() {
        this.state.closed = true;

        try {
            const sections = this.sections();
            const lines = Math.ceil(sections.prompt.length / this.width);
            if (sections.rest) {
                this.write(ansi.cursor.down(sections.rest.length));
            }
            this.write("\n".repeat(lines));
        } catch (err) { /* do nothing */ }

        this.emit("close");
    }

    start() {
        if (!this.stop && this.options.show !== false) {
            this.stop = keypress.listen(this, this.keypress.bind(this));
            this.once("close", this.stop);
        }
    }

    async skip() {
        this.skipped = this.options.skip === true;
        if (is.function(this.options.skip)) {
            this.skipped = await this.options.skip.call(this, this.name, this.value);
        }
        return this.skipped;
    }

    async initialize() {
        const { format, options, result } = this;

        this.format = () => format.call(this, this.value);
        this.result = () => result.call(this, this.value);

        if (is.function(options.initial)) {
            this.initial = await options.initial.call(this, this);
        }

        if (is.function(options.onRun)) {
            await options.onRun.call(this, this);
        }

        // if "options.onSubmit" is defined, we wrap the "submit" method to guarantee
        // that "onSubmit" will always called first thing inside the submit
        // method, regardless of how it's handled in inheriting prompts.
        if (is.function(options.onSubmit)) {
            const onSubmit = options.onSubmit.bind(this);
            const submit = this.submit.bind(this);
            delete this.options.onSubmit;
            this.submit = async () => {
                await onSubmit(this.name, this.value, this);
                return submit();
            };
        }

        await this.start();
        await this.render();
    }

    render() {
        throw new Error("expected prompt to have a custom render method");
    }

    run() {
        return new Promise(async (resolve, reject) => {
            this.once("submit", resolve);
            this.once("cancel", reject);
            if (await this.skip()) {
                this.render = () => {};
                return this.submit();
            }
            await this.initialize();
            this.emit("run");
        });
    }

    async element(name, choice, i) {
        const { options, state, symbols, timers } = this;
        const timer = timers && timers[name];
        state.timer = timer;
        const value = options[name] || state[name] || symbols[name];
        const val = choice && !is.nil(choice[name]) ? choice[name] : await value;
        if (val === "") {
            return val; 
        }

        const res = await this.resolve(val, state, choice, i);
        if (!res && choice && choice[name]) {
            return this.resolve(value, state, choice, i);
        }
        return res;
    }

    async prefix() {
        let element = await this.element("prefix") || this.symbols;
        const timer = this.timers && this.timers.prefix;
        const state = this.state;
        state.timer = timer;
        if (utils.isObject(element)) {
            element = element[state.status] || element.pending; 
        }
        if (!utils.hasColor(element)) {
            const style = this.styles[state.status] || this.styles.pending;
            return style(element);
        }
        return element;
    }

    async message() {
        const message = await this.element("message");
        if (!utils.hasColor(message)) {
            return this.styles.strong(message);
        }
        return message;
    }

    async separator() {
        const element = await this.element("separator") || this.symbols;
        const timer = this.timers && this.timers.separator;
        const state = this.state;
        state.timer = timer;
        const value = element[state.status] || element.pending || state.separator;
        let ele = await this.resolve(value, state);
        if (utils.isObject(ele)) {
            ele = ele[state.status] || ele.pending; 
        }
        if (!utils.hasColor(ele)) {
            return this.styles.muted(ele);
        }
        return ele;
    }

    async pointer(choice, i) {
        const val = await this.element("pointer", choice, i);

        if (is.string(val) && utils.hasColor(val)) {
            return val;
        }

        if (val) {
            const styles = this.styles;
            const focused = this.index === i;
            const style = focused ? styles.primary : (val) => val;
            const ele = await this.resolve(val[focused ? "on" : "off"] || val, this.state);
            const styled = !utils.hasColor(ele) ? style(ele) : ele;
            return focused ? styled : " ".repeat(ele.length);
        }
    }

    async indicator(choice, i) {
        const val = await this.element("indicator", choice, i);
        if (is.string(val) && utils.hasColor(val)) {
            return val;
        }
        if (val) {
            const styles = this.styles;
            const enabled = choice.enabled === true;
            const style = enabled ? styles.success : styles.dark;
            const ele = val[enabled ? "on" : "off"] || val;
            return !utils.hasColor(ele) ? style(ele) : ele;
        }
        return "";
    }

    body() {
        return null;
    }

    footer() {
        if (this.state.status === "pending") {
            return this.element("footer");
        }
    }

    header() {
        if (this.state.status === "pending") {
            return this.element("header");
        }
    }

    async hint() {
        if (this.state.status === "pending" && !this.isValue(this.state.input)) {
            const hint = await this.element("hint");
            if (!utils.hasColor(hint)) {
                return this.styles.muted(hint);
            }
            return hint;
        }
    }

    error(err) {
        return !this.state.submitted ? (err || this.state.error) : "";
    }

    format(value) {
        return value;
    }

    result(value) {
        return value;
    }

    validate(value) {
        if (this.options.required === true) {
            return this.isValue(value);
        }
        return true;
    }

    isValue(value) {
        return !is.nil(value) && value !== "";
    }

    resolve(value, ...args) {
        return utils.resolve(this, value, ...args);
    }

    get base() {
        return Prompt.prototype;
    }

    get style() {
        return this.styles[this.state.status];
    }

    get height() {
        return this.options.rows || utils.height(this.stdout, 25);
    }

    get width() {
        return this.options.columns || utils.width(this.stdout, 80);
    }

    get size() {
        return { width: this.width, height: this.height };
    }

    set cursor(value) {
        this.state.cursor = value;
    }

    get cursor() {
        return this.state.cursor;
    }

    set input(value) {
        this.state.input = value;
    }

    get input() {
        return this.state.input;
    }

    set value(value) {
        this.state.value = value;
    }

    get value() {
        const { input, value } = this.state;
        const result = [value, input].find(this.isValue.bind(this));
        return this.isValue(result) ? result : this.initial;
    }

    static get prompt() {
        return (options) => new this(options).run();
    }
}

function setOptions(prompt) {
    const isValidKey = (key) => {
        return prompt[key] === void 0 || is.function(prompt[key]);
    };

    const ignore = [
        "actions",
        "choices",
        "initial",
        "margin",
        "roles",
        "styles",
        "symbols",
        "theme",
        "timers",
        "value"
    ];

    const ignoreFn = [
        "body",
        "footer",
        "error",
        "header",
        "hint",
        "indicator",
        "message",
        "prefix",
        "separator",
        "skip"
    ];

    for (const key of Object.keys(prompt.options)) {
        if (ignore.includes(key)) {
            continue; 
        }
        if (/^on[A-Z]/.test(key)) {
            continue; 
        }
        const option = prompt.options[key];
        if (is.function(option) && isValidKey(key)) {
            if (!ignoreFn.includes(key)) {
                prompt[key] = option.bind(prompt);
            }
        } else if (!is.function(prompt[key])) {
            prompt[key] = option;
        }
    }
}

function margin(value) {
    if (is.number(value)) {
        value = [value, value, value, value];
    }
    const arr = [].concat(value || []);
    const pad = (i) => i % 2 === 0 ? "\n" : " ";
    const res = [];
    for (let i = 0; i < 4; i++) {
        const char = pad(i);
        if (arr[i]) {
            res.push(char.repeat(arr[i]));
        } else {
            res.push("");
        }
    }
    return res;
}

module.exports = Prompt;
