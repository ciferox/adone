const {
    is,
    vendor: { lodash: _ },
    terminal
} = adone;

const {
    chalk
} = terminal;

/**
 * Get the checkbox
 * @param  {Boolean} checked - add a X or not to the checkbox
 * @return {String} Composited checkbox string
 */
const getCheckbox = (term, checked) => {
    return checked ? chalk.green(adone.text.unicode.symbol.radioOn) : adone.text.unicode.symbol.radioOff;
};

/**
 * Function for rendering checkbox choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */
const renderChoices = (term, choices, pointer) => {
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
            output += ` (${is.string(choice.disabled) ? choice.disabled : "Disabled"})`;
        } else {
            const isSelected = (i - separatorOffset === pointer);
            output += isSelected ? chalk.cyan(adone.text.unicode.symbol.pointer) : " ";
            output += `${getCheckbox(term, choice.checked)} ${choice.name}`;
        }

        output += "\n";
    });

    return output.replace(/\n$/, "");
};

export default class CheckboxPrompt extends terminal.BasePrompt {
    constructor(term, question, answers) {
        super(term, question, answers);

        if (!this.opt.choices) {
            this.throwParamError("choices");
        }

        if (is.array(this.opt.default)) {
            this.opt.choices.forEach(function (choice) {
                if (this.opt.default.includes(choice.value)) {
                    choice.checked = true;
                }
            }, this);
        }

        this.pointer = 0;
        this.firstRender = true;

        // Make sure no default is set (so it won't be printed)
        this.opt.default = null;

        this.paginator = new terminal.Paginator(this.term);
    }

    /**
     * Start the Inquiry session
     * @param  {Function} cb      Callback when prompt is done
     * @return {this}
     */
    _run(cb) {
        this.done = cb;

        const events = this.observe();

        events.on("line", async () => {
            const value = this.getCurrentValue();
            const state = await this.validate(value);
            if (state.isValid === true) {
                events.destroy();
                return this.onEnd(state);
            }
            return this.onError(state);
        }).on("normalizedUpKey", (event) => {
            this.onUpKey(event);
        }).on("normalizedDownKey", (event) => {
            this.onDownKey(event);
        }).on("numberKey", (event) => {
            this.onNumberKey(event);
        }).on("spaceKey", (event) => {
            this.onSpaceKey(event);
        }).on("aKey", (event) => {
            this.onAllKey(event);
        }).on("iKey", (event) => {
            this.onInverseKey(event);
        });

        // Init the prompt
        this.term.hideCursor();
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
            message += `(Press ${chalk.cyan.bold("<space>")} to select, ${chalk.cyan.bold("<a>")} to toggle all, ${chalk.cyan.bold("<i>")} to invert selection)`;
        }

        // Render choices or answer depending on the state
        if (this.status === "answered") {
            message += chalk.cyan(this.selection.join(", "));
        } else {
            const choicesStr = renderChoices(this.term, this.opt.choices, this.pointer);
            const indexPosition = this.opt.choices.indexOf(this.opt.choices.getChoice(this.pointer));
            message += `\n${this.paginator.paginate(choicesStr, indexPosition, this.opt.pageSize)}`;
        }

        if (error) {
            bottomContent = chalk.red(">> ") + error;
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
        this.term.showCursor();
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
        if (!is.undefined(item)) {
            this.opt.choices.getChoice(index).checked = !item.checked;
        }
    }
}
