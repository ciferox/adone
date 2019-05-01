const {
    is
} = adone;

const colors = require("ansi-colors");
const Prompt = require("../prompt");
const roles = require("../roles");
const utils = require("../utils");
const { reorder, scrollUp, scrollDown, isObject, swap } = utils;

class ArrayPrompt extends Prompt {
    constructor(options) {
        super(options);
        this.cursorHide();
        this.maxSelected = options.maxSelected || Infinity;
        this.multiple = options.multiple || false;
        this.initial = options.initial || 0;
        this.delay = options.delay || 0;
        this.longest = 0;
        this.num = "";
    }

    async initialize() {
        if (is.function(this.options.initial)) {
            this.initial = await this.options.initial.call(this);
        }
        await this.reset(true);
        await super.initialize();
    }

    async reset() {
        let { choices, initial, autofocus, suggest } = this.options;
        this.state._choices = [];
        this.state.choices = [];

        this.choices = await Promise.all(await this.toChoices(choices));
        this.choices.forEach((ch) => (ch.enabled = false));

        if (!is.function(suggest) && this.selectable.length === 0) {
            throw new Error("At least one choice must be selectable");
        }

        if (isObject(initial)) {
            initial = Object.keys(initial);
        }
        if (is.array(initial)) {
            if (!is.nil(autofocus)) {
                this.index = this.findIndex(autofocus);
            }
            initial.forEach((v) => this.enable(this.find(v)));
            await this.render();
        } else {
            if (!is.nil(autofocus)) {
                initial = autofocus;
            }
            if (is.string(initial)) {
                initial = this.findIndex(initial);
            }
            if (is.number(initial) && initial > -1) {
                this.index = Math.max(0, Math.min(initial, this.choices.length));
                this.enable(this.find(this.index));
            }
        }

        if (this.isDisabled(this.focused)) {
            await this.down();
        }
    }

    async toChoices(value, parent) {
        this.state.loadingChoices = true;
        const choices = [];
        let index = 0;

        const toChoices = async (items, parent) => {
            if (is.function(items)) {
                items = await items.call(this);
            }
            if (items instanceof Promise) {
                items = await items;
            }

            for (let i = 0; i < items.length; i++) {
                const choice = items[i] = await this.toChoice(items[i], index++, parent);
                choices.push(choice);

                if (choice.choices) {
                    await toChoices(choice.choices, choice);
                }
            }
            return choices;
        };

        return toChoices(value, parent)
            .then((choices) => {
                this.state.loadingChoices = false;
                return choices;
            });
    }

    async toChoice(ele, i, parent) {
        if (is.function(ele)) {
            ele = await ele.call(this, this);
        }
        if (ele instanceof Promise) {
            ele = await ele;
        }
        if (is.string(ele)) {
            ele = { name: ele };
        }

        if (ele.normalized) {
            return ele;
        }
        ele.normalized = true;

        const origVal = ele.value;
        const role = roles(ele.role, this.options);
        ele = role(this, ele);

        if (is.string(ele.disabled) && !ele.hint) {
            ele.hint = ele.disabled;
            ele.disabled = true;
        }

        if (ele.disabled === true && is.nil(ele.hint)) {
            ele.hint = "(disabled)";
        }

        // if the choice was already normalized, return it
        if (!is.nil(ele.index)) {
            return ele;
        }
        ele.name = ele.name || ele.key || ele.title || ele.value || ele.message;
        ele.message = ele.message || ele.name || "";
        ele.value = [ele.value, ele.name].find(this.isValue.bind(this));

        ele.input = "";
        ele.index = i;
        ele.cursor = 0;

        utils.define(ele, "parent", parent);
        ele.level = parent ? parent.level + 1 : 1;
        if (is.nil(ele.indent)) {
            ele.indent = parent ? `${parent.indent}  ` : (ele.indent || "");
        }

        ele.path = parent ? `${parent.path}.${ele.name}` : ele.name;
        ele.enabled = Boolean(this.multiple && !this.isDisabled(ele) && (ele.enabled || this.isSelected(ele)));

        if (!this.isDisabled(ele)) {
            this.longest = Math.max(this.longest, colors.unstyle(ele.message).length);
        }

        // shallow clone the choice first
        const choice = { ...ele };

        // then allow the choice to be reset using the "original" values
        ele.reset = (input = choice.input, value = choice.value) => {
            for (const key of Object.keys(choice)) {
                ele[key] = choice[key];
            }
            ele.input = input;
            ele.value = value;
        };

        if (is.nil(origVal) && is.function(ele.initial)) {
            ele.input = await ele.initial.call(this, this.state, ele, i);
        }

        return ele;
    }

    async onChoice(choice, i) {
        this.emit("choice", choice, i, this);

        if (is.function(choice.onChoice)) {
            await choice.onChoice.call(this, this.state, choice, i);
        }
    }

    async addChoice(ele, i, parent) {
        const choice = await this.toChoice(ele, i, parent);
        this.choices.push(choice);
        this.index = this.choices.length - 1;
        this.limit = this.choices.length;
        return choice;
    }

    async newItem(item, i, parent) {
        const ele = { name: "New choice name?", editable: true, newChoice: true, ...item };
        const choice = await this.addChoice(ele, i, parent);

        choice.updateChoice = () => {
            delete choice.newChoice;
            choice.name = choice.message = choice.input;
            choice.input = "";
            choice.cursor = 0;
        };

        return this.render();
    }

    indent(choice) {
        if (is.nil(choice.indent)) {
            return choice.level > 1 ? "  ".repeat(choice.level - 1) : "";
        }
        return choice.indent;
    }

    dispatch(s, key) {
        if (this.multiple && this[key.name]) {
            return this[key.name]();
        }
        this.alert();
    }

    focus(choice, enabled) {
        if (!is.boolean(enabled)) {
            enabled = choice.enabled;
        }
        if (enabled && !choice.enabled && this.selected.length >= this.maxSelected) {
            return this.alert();
        }
        this.index = choice.index;
        choice.enabled = enabled && !this.isDisabled(choice);
        return choice;
    }

    space() {
        if (!this.multiple) {
            return this.alert();
        }
        this.toggle(this.focused);
        return this.render();
    }

    a() {
        if (this.maxSelected < this.choices.length) {
            return this.alert();
        }
        const enabled = this.selectable.every((ch) => ch.enabled);
        this.choices.forEach((ch) => (ch.enabled = !enabled));
        return this.render();
    }

    i() {
        // don't allow choices to be inverted if it will result in
        // more than the maximum number of allowed selected items.
        if (this.choices.length - this.selected.length > this.maxSelected) {
            return this.alert();
        }
        this.choices.forEach((ch) => (ch.enabled = !ch.enabled));
        return this.render();
    }

    g(choice = this.focused) {
        if (!this.choices.some((ch) => Boolean(ch.parent))) {
            return this.a();
        }
        this.toggle((choice.parent && !choice.choices) ? choice.parent : choice);
        return this.render();
    }

    toggle(choice, enabled) {
        if (!choice.enabled && this.selected.length >= this.maxSelected) {
            return this.alert();
        }

        if (!is.boolean(enabled)) {
            enabled = !choice.enabled;
        }
        choice.enabled = enabled;

        if (choice.choices) {
            choice.choices.forEach((ch) => this.toggle(ch, enabled));
        }

        let parent = choice.parent;
        while (parent) {
            const choices = parent.choices.filter((ch) => this.isDisabled(ch));
            parent.enabled = choices.every((ch) => ch.enabled === true);
            parent = parent.parent;
        }

        reset(this, this.choices);
        this.emit("toggle", choice, this);
        return choice;
    }

    enable(choice) {
        if (this.selected.length >= this.maxSelected) {
            return this.alert();
        }
        choice.enabled = !this.isDisabled(choice);
        choice.choices && choice.choices.forEach(this.enable.bind(this));
        return choice;
    }

    disable(choice) {
        choice.enabled = false;
        choice.choices && choice.choices.forEach(this.disable.bind(this));
        return choice;
    }

    number(n) {
        this.num += n;

        const number = (num) => {
            const i = Number(num);
            if (i > this.choices.length - 1) {
                return this.alert();
            }

            const focused = this.focused;
            const choice = this.choices.find((ch) => i === ch.index);

            if (!choice.enabled && this.selected.length >= this.maxSelected) {
                return this.alert();
            }

            if (this.visible.indexOf(choice) === -1) {
                const choices = reorder(this.choices);
                const actualIdx = choices.indexOf(choice);

                if (focused.index > actualIdx) {
                    const start = choices.slice(actualIdx, actualIdx + this.limit);
                    const end = choices.filter((ch) => !start.includes(ch));
                    this.choices = start.concat(end);
                } else {
                    const pos = actualIdx - this.limit + 1;
                    this.choices = choices.slice(pos).concat(choices.slice(0, pos));
                }
            }

            this.index = this.choices.indexOf(choice);
            this.toggle(this.focused);
            return this.render();
        };

        clearTimeout(this.numberTimeout);

        return new Promise((resolve) => {
            const len = this.choices.length;
            const num = this.num;

            const handle = (val = false, res) => {
                clearTimeout(this.numberTimeout);
                if (val) {
                    number(num);
                }
                this.num = "";
                resolve(res);
            };

            if (num === "0" || (num.length === 1 && Number(`${num}0`) > len)) {
                return handle(true);
            }

            if (Number(num) > len) {
                return handle(false, this.alert());
            }

            this.numberTimeout = setTimeout(() => handle(true), this.delay);
        });
    }

    home() {
        this.choices = reorder(this.choices);
        this.index = 0;
        return this.render();
    }

    end() {
        const pos = this.choices.length - this.limit;
        const choices = reorder(this.choices);
        this.choices = choices.slice(pos).concat(choices.slice(0, pos));
        this.index = this.limit - 1;
        return this.render();
    }

    first() {
        this.index = 0;
        return this.render();
    }

    last() {
        this.index = this.visible.length - 1;
        return this.render();
    }

    prev() {
        if (this.visible.length <= 1) {
            return this.alert();
        }
        return this.up();
    }

    next() {
        if (this.visible.length <= 1) {
            return this.alert();
        }
        return this.down();
    }

    right() {
        if (this.cursor >= this.input.length) {
            return this.alert();
        }
        this.cursor++;
        return this.render();
    }

    left() {
        if (this.cursor <= 0) {
            return this.alert();
        }
        this.cursor--;
        return this.render();
    }

    up() {
        const len = this.choices.length;
        const vis = this.visible.length;
        const idx = this.index;
        if (this.options.scroll === false && idx === 0) {
            return this.alert();
        }
        if (len > vis && idx === 0) {
            return this.scrollUp();
        }
        this.index = ((idx - 1 % len) + len) % len;
        if (this.isDisabled()) {
            return this.up();
        }
        return this.render();
    }

    down() {
        const len = this.choices.length;
        const vis = this.visible.length;
        const idx = this.index;
        if (this.options.scroll === false && idx === vis - 1) {
            return this.alert();
        }
        if (len > vis && idx === vis - 1) {
            return this.scrollDown();
        }
        this.index = (idx + 1) % len;
        if (this.isDisabled()) {
            return this.down();
        }
        return this.render();
    }

    scrollUp(i = 0) {
        this.choices = scrollUp(this.choices);
        this.index = i;
        if (this.isDisabled()) {
            return this.up();
        }
        return this.render();
    }

    scrollDown(i = this.visible.length - 1) {
        this.choices = scrollDown(this.choices);
        this.index = i;
        if (this.isDisabled()) {
            return this.down();
        }
        return this.render();
    }

    async shiftUp() {
        if (this.options.sort === true) {
            this.sorting = true;
            this.swap(this.index - 1);
            await this.up();
            this.sorting = false;
            return;
        }
        return this.scrollUp(this.index);
    }

    async shiftDown() {
        if (this.options.sort === true) {
            this.sorting = true;
            this.swap(this.index + 1);
            await this.down();
            this.sorting = false;
            return;
        }
        return this.scrollDown(this.index);
    }

    pageUp() {
        if (this.visible.length <= 1) {
            return this.alert();
        }
        this.limit = Math.max(this.limit - 1, 0);
        this.index = Math.min(this.limit - 1, this.index);
        this._limit = this.limit;
        if (this.isDisabled()) {
            return this.up();
        }
        return this.render();
    }

    pageDown() {
        if (this.visible.length >= this.choices.length) {
            return this.alert();
        }
        this.index = Math.max(0, this.index);
        this.limit = Math.min(this.limit + 1, this.choices.length);
        this._limit = this.limit;
        if (this.isDisabled()) {
            return this.down();
        }
        return this.render();
    }

    swap(pos) {
        swap(this.choices, this.index, pos);
    }

    isDisabled(choice = this.focused) {
        const keys = ["disabled", "collapsed", "hidden", "completing", "readonly"];
        if (choice && keys.some((key) => choice[key] === true)) {
            return true;
        }
        return choice && choice.role === "heading";
    }

    isEnabled(choice = this.focused) {
        if (is.array(choice)) {
            return choice.every((ch) => this.isEnabled(ch));
        }
        if (choice.choices) {
            const choices = choice.choices.filter((ch) => !this.isDisabled(ch));
            return choice.enabled && choices.every((ch) => this.isEnabled(ch));
        }
        return choice.enabled && !this.isDisabled(choice);
    }

    isChoice(choice, value) {
        return choice.name === value || choice.index === Number(value);
    }

    isSelected(choice) {
        if (is.array(this.initial)) {
            return this.initial.some((value) => this.isChoice(choice, value));
        }
        return this.isChoice(choice, this.initial);
    }

    map(names = [], prop = "value") {
        return [].concat(names || []).reduce((acc, name) => {
            acc[name] = this.find(name, prop);
            return acc;
        }, {});
    }

    filter(value, prop) {
        const isChoice = (ele, i) => [ele.name, i].includes(value);
        const fn = is.function(value) ? value : isChoice;
        const choices = this.options.multiple ? this.state._choices : this.choices;
        const result = choices.filter(fn);
        if (prop) {
            return result.map((ch) => ch[prop]);
        }
        return result;
    }

    find(value, prop) {
        if (isObject(value)) {
            return prop ? value[prop] : value;
        }
        const isChoice = (ele, i) => [ele.name, i].includes(value);
        const fn = is.function(value) ? value : isChoice;
        const choice = this.choices.find(fn);
        if (choice) {
            return prop ? choice[prop] : choice;
        }
    }

    findIndex(value) {
        return this.choices.indexOf(this.find(value));
    }

    async submit() {
        const choice = this.focused;
        if (!choice) {
            return this.alert();
        }

        if (choice.newChoice) {
            if (!choice.input) {
                return this.alert();
            }
            choice.updateChoice();
            return this.render();
        }

        if (this.choices.some((ch) => ch.newChoice)) {
            return this.alert();
        }

        const { reorder, sort } = this.options;
        const multi = this.multiple === true;
        let value = this.selected;
        if (value === void 0) {
            return this.alert();
        }

        // re-sort choices to original order
        if (is.array(value) && reorder !== false && sort !== true) {
            value = utils.reorder(value);
        }

        this.value = multi ? value.map((ch) => ch.name) : value.name;
        return super.submit();
    }

    set choices(choices = []) {
        this.state._choices = this.state._choices || [];
        this.state.choices = choices;

        for (const choice of choices) {
            if (!this.state._choices.some((ch) => ch.name === choice.name)) {
                this.state._choices.push(choice);
            }
        }

        if (!this._initial && this.options.initial) {
            this._initial = true;
            const init = this.initial;
            if (is.string(init) || is.number(init)) {
                const choice = this.find(init);
                if (choice) {
                    this.initial = choice.index;
                    this.focus(choice, true);
                }
            }
        }
    }

    get choices() {
        return reset(this, this.state.choices || []);
    }

    set visible(visible) {
        this.state.visible = visible;
    }

    get visible() {
        return (this.state.visible || this.choices).slice(0, this.limit);
    }

    set limit(num) {
        this.state.limit = num;
    }

    get limit() {
        const { state, options, choices } = this;
        const limit = state.limit || this._limit || options.limit || choices.length;
        return Math.min(limit, this.height);
    }

    set value(value) {
        super.value = value;
    }

    get value() {
        if (!is.string(super.value) && super.value === this.initial) {
            return this.input;
        }
        return super.value;
    }

    set index(i) {
        this.state.index = i;
    }

    get index() {
        return Math.max(0, this.state ? this.state.index : 0);
    }

    get enabled() {
        return this.filter(this.isEnabled.bind(this));
    }

    get focused() {
        const choice = this.choices[this.index];
        if (choice && this.state.submitted && this.multiple !== true) {
            choice.enabled = true;
        }
        return choice;
    }

    get selectable() {
        return this.choices.filter((choice) => !this.isDisabled(choice));
    }

    get selected() {
        return this.multiple ? this.enabled : this.focused;
    }
}

function reset(prompt, choices) {
    if (choices instanceof Promise) {
        return choices;
    }
    if (is.function(choices)) {
        if (utils.isAsyncFn(choices)) {
            return choices;
        }
        choices = choices.call(prompt, prompt);
    }
    for (const choice of choices) {
        if (is.array(choice.choices)) {
            const items = choice.choices.filter((ch) => !prompt.isDisabled(ch));
            choice.enabled = items.every((ch) => ch.enabled === true);
        }
        if (prompt.isDisabled(choice) === true) {
            delete choice.enabled;
        }
    }
    return choices;
}

module.exports = ArrayPrompt;
