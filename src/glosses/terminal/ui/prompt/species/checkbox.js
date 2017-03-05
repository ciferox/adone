import adone from "adone";
import BasePrompt from "./base";
import Paginator from "../paginator";
const { vendor: { lodash: _ }, terminal } = adone;
const observe = require("../events");

/**
 * Get the checkbox
 * @param  {Boolean} checked - add a X or not to the checkbox
 * @return {String} Composited checkbox string
 */
const getCheckbox = (checked) => {
    return checked ? terminal.style.green(adone.text.figure.radioOn) : adone.text.figure.radioOff;
};

/**
 * Function for rendering checkbox choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */
const renderChoices = (choices, pointer) => {
    let output = "";
    let separatorOffset = 0;

    choices.forEach((choice, i) => {
        if (choice.type === "separator") {
            separatorOffset++;
            output += ` ${choice}\n`;
            return;
        }

        if (choice.disabled) {
            separatorOffset++;
            output += ` - ${choice.name}`;
            output += ` (${_.isString(choice.disabled) ? choice.disabled : "Disabled"})`;
        } else {
            const isSelected = (i - separatorOffset === pointer);
            output += isSelected ? terminal.style.cyan(adone.text.figure.pointer) : " ";
            output += `${getCheckbox(choice.checked)} ${choice.name}`;
        }

        output += "\n";
    });

    return output.replace(/\n$/, "");
};

export default class CheckboxPrompt extends BasePrompt {
    constructor(question, answers) {
        super(question, answers);

        if (!this.opt.choices) {
            this.throwParamError("choices");
        }

        if (_.isArray(this.opt.default)) {
            this.opt.choices.forEach(function (choice) {
                if (this.opt.default.indexOf(choice.value) >= 0) {
                    choice.checked = true;
                }
            }, this);
        }

        this.pointer = 0;
        this.firstRender = true;

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

        const events = observe();

        const validation = this.handleSubmitEvents(events.line.map(this.getCurrentValue.bind(this)));
        validation.success.forEach(this.onEnd.bind(this));
        validation.error.forEach(this.onError.bind(this));

        events.normalizedUpKey.takeUntil(validation.success).forEach(this.onUpKey.bind(this));
        events.normalizedDownKey.takeUntil(validation.success).forEach(this.onDownKey.bind(this));
        events.numberKey.takeUntil(validation.success).forEach(this.onNumberKey.bind(this));
        events.spaceKey.takeUntil(validation.success).forEach(this.onSpaceKey.bind(this));
        events.aKey.takeUntil(validation.success).forEach(this.onAllKey.bind(this));
        events.iKey.takeUntil(validation.success).forEach(this.onInverseKey.bind(this));

        // Init the prompt
        terminal.hideCursor();
        this.render();
        this.firstRender = false;

        return this;
    }

    /**
     * Render the prompt to screen
     * @return {Prompt} self
     */
    render(error) {
        // Render question
        let message = this.getQuestion();
        let bottomContent = "";

        if (this.firstRender) {
            message += `(Press ${terminal.style.cyan.bold("<space>")} to select, ${terminal.style.cyan.bold("<a>")} to toggle all, ${terminal.style.cyan.bold("<i>")} to inverse selection)`;
        }

        // Render choices or answer depending on the state
        if (this.status === "answered") {
            message += terminal.style.cyan(this.selection.join(", "));
        } else {
            const choicesStr = renderChoices(this.opt.choices, this.pointer);
            const indexPosition = this.opt.choices.indexOf(this.opt.choices.getChoice(this.pointer));
            message += `\n${this.paginator.paginate(choicesStr, indexPosition, this.opt.pageSize)}`;
        }

        if (error) {
            bottomContent = terminal.style.red(">> ") + error;
        }

        this.screen.render(message, bottomContent);
    }

    /**
     * When user press `enter` key
     */
    onEnd(state) {
        this.status = "answered";

        // Rerender prompt (and clean subline error)
        this.render();

        this.screen.done();
        terminal.showCursor();
        this.done(state.value);
    }

    onError(state) {
        this.render(state.isValid);
    }

    getCurrentValue() {
        const choices = this.opt.choices.filter((choice) => {
            return Boolean(choice.checked) && !choice.disabled;
        });

        this.selection = _.map(choices, "short");
        return _.map(choices, "value");
    }

    onUpKey() {
        const len = this.opt.choices.realLength;
        this.pointer = (this.pointer > 0) ? this.pointer - 1 : len - 1;
        this.render();
    }

    onDownKey() {
        const len = this.opt.choices.realLength;
        this.pointer = (this.pointer < len - 1) ? this.pointer + 1 : 0;
        this.render();
    }

    onNumberKey(input) {
        if (input <= this.opt.choices.realLength) {
            this.pointer = input - 1;
            this.toggleChoice(this.pointer);
        }
        this.render();
    }

    onSpaceKey() {
        this.toggleChoice(this.pointer);
        this.render();
    }

    onAllKey() {
        const shouldBeChecked = Boolean(this.opt.choices.find((choice) => {
            return choice.type !== "separator" && !choice.checked;
        }));

        this.opt.choices.forEach((choice) => {
            if (choice.type !== "separator") {
                choice.checked = shouldBeChecked;
            }
        });

        this.render();
    }

    onInverseKey() {
        this.opt.choices.forEach((choice) => {
            if (choice.type !== "separator") {
                choice.checked = !choice.checked;
            }
        });

        this.render();
    }

    toggleChoice(index) {
        const item = this.opt.choices.getChoice(index);
        if (item !== undefined) {
            this.opt.choices.getChoice(index).checked = !item.checked;
        }
    }
}
