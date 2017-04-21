
import BasePrompt from "./base";
import Paginator from "../paginator";
import runAsync from "../runasync";
const { vendor: { lodash: _ }, terminal } = adone;
const observe = require("../events");

/**
 * Function for rendering list choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */
const listRender = (choices, pointer) => {
    let output = "";
    let separatorOffset = 0;

    choices.forEach((choice, i) => {
        if (choice.type === "separator") {
            separatorOffset++;
            output += `  ${choice}\n`;
            return;
        }

        if (choice.disabled) {
            separatorOffset++;
            output += `  - ${choice.name}`;
            output += ` (${_.isString(choice.disabled) ? choice.disabled : "Disabled"})`;
            output += "\n";
            return;
        }

        const isSelected = (i - separatorOffset === pointer);
        let line = (isSelected ? `${adone.text.figure.pointer} ` : "  ") + choice.name;
        if (isSelected) {
            line = terminal.style.cyan(line);
        }
        output += `${line} \n`;
    });

    return output.replace(/\n$/, "");
};

export default class ListPrompt extends BasePrompt {
    constructor(question, answers) {
        super(question, answers);
        if (!this.opt.choices) {
            this.throwParamError("choices");
        }

        this.firstRender = true;
        this.selected = 0;

        const def = this.opt.default;

        // Default being a Number
        if (_.isNumber(def) && def >= 0 && def < this.opt.choices.realLength) {
            this.selected = def;
        }

        // Default being a String
        if (_.isString(def)) {
            this.selected = this.opt.choices.pluck("value").indexOf(def);
        }

        // Make sure no default is set (so it won't be printed)
        this.opt.default = null;

        this.paginator = new Paginator();
    }

    /**
     * Start the Inquiry session
     * @param  {Function} cb      Callback when prompt is done
     * @return {this}
     */
    _run(cb) {
        this.done = cb;

        const self = this;

        const events = observe();
        events.normalizedUpKey.takeUntil(events.line).forEach(this.onUpKey.bind(this));
        events.normalizedDownKey.takeUntil(events.line).forEach(this.onDownKey.bind(this));
        events.numberKey.takeUntil(events.line).forEach(this.onNumberKey.bind(this));
        events.line.take(1).map(this.getCurrentValue.bind(this)).flatMap((value) => {
            return runAsync(self.opt.filter)(value).catch((err) => {
                return err;
            });
        }).forEach(this.onSubmit.bind(this));

        // Init the prompt
        terminal.hideCursor();
        this.render();

        return this;
    }

    /**
     * Render the prompt to screen
     * @return {Prompt} self
     */
    render() {
        // Render question
        let message = this.getQuestion();

        if (this.firstRender) {
            message += terminal.style.dim("(Use arrow keys)");
        }

        // Render choices or answer depending on the state
        if (this.status === "answered") {
            message += terminal.style.cyan(this.opt.choices.getChoice(this.selected).short);
        } else {
            const choicesStr = listRender(this.opt.choices, this.selected);
            const indexPosition = this.opt.choices.indexOf(this.opt.choices.getChoice(this.selected));
            message += `\n${this.paginator.paginate(choicesStr, indexPosition, this.opt.pageSize)}`;
        }

        this.firstRender = false;

        this.screen.render(message);
    }

    /**
     * When user press `enter` key
     */
    onSubmit(value) {
        this.status = "answered";

        // Rerender prompt
        this.render();

        this.screen.done();
        terminal.showCursor();
        this.done(value);
    }

    getCurrentValue() {
        return this.opt.choices.getChoice(this.selected).value;
    }

    /**
     * When user press a key
     */
    onUpKey() {
        const len = this.opt.choices.realLength;
        this.selected = (this.selected > 0) ? this.selected - 1 : len - 1;
        this.render();
    }

    onDownKey() {
        const len = this.opt.choices.realLength;
        this.selected = (this.selected < len - 1) ? this.selected + 1 : 0;
        this.render();
    }

    onNumberKey(input) {
        if (input <= this.opt.choices.realLength) {
            this.selected = input - 1;
        }
        this.render();
    }
}
