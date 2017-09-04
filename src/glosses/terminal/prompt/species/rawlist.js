const {
    is,
    vendor: { lodash: _ },
    terminal: { Terminal }
} = adone;

/**
 * Function for rendering list choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */
const renderChoices = (terminal, choices, pointer) => {
    let output = "";
    let separatorOffset = 0;

    choices.forEach((choice, i) => {
        output += "\n  ";

        if (choice.type === "separator") {
            separatorOffset++;
            output += ` ${choice}`;
            return;
        }

        const index = i - separatorOffset;
        let display = `${index + 1}) ${choice.name}`;
        if (index === pointer) {
            display = terminal.cyan(display);
        }
        output += display;
    });

    return output;
};

export default class RawlistPrompt extends Terminal.BasePrompt {
    constructor(terminal, question, answers) {
        super(terminal, question, answers);
        if (!this.opt.choices) {
            this.throwParamError("choices");
        }

        this.opt.validChoices = this.opt.choices.filter(Terminal.Separator.exclude);

        this.selected = 0;
        this.rawDefault = 0;

        _.extend(this.opt, {
            validate(val) {
                return !is.nil(val);
            }
        });

        const def = this.opt.default;
        if (_.isNumber(def) && def >= 0 && def < this.opt.choices.realLength) {
            this.selected = this.rawDefault = def;
        }

        // Make sure no default is set (so it won't be printed)
        this.opt.default = null;

        this.paginator = new Terminal.Paginator(this.terminal);
    }

    /**
     * Start the Inquiry session
     * @param  {Function} cb      Callback when prompt is done
     * @return {this}
     */
    _run(cb) {
        this.done = cb;

        // Once user confirm (enter key)
        const events = this.observe();

        events.on("line", async (input) => {
            const value = this.getCurrentValue(input);
            const state = await this.validate(value);
            if (state.isValid === true) {
                events.destroy();
                return this.onEnd(state);
            }
            return this.onError(state);
        }).on("keypress", (event) => {
            this.onKeypress(event);
        });

        // Init the prompt
        this.render();

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

        if (this.status === "answered") {
            message += this.terminal.cyan(this.answer);
        } else {
            const choicesStr = renderChoices(this.terminal, this.opt.choices, this.selected);
            message += this.paginator.paginate(choicesStr, this.selected, this.opt.pageSize);
            message += "\n  Answer: ";
        }

        message += this.terminal.readline.line;

        if (error) {
            bottomContent = `\n${this.terminal.red(">> ")}${error}`;
        }

        this.screen.render(message, bottomContent);
    }

    /**
     * When user press `enter` key
     */
    getCurrentValue(index) {
        if (is.nil(index) || index === "") {
            index = this.rawDefault;
        } else {
            index -= 1;
        }

        const choice = this.opt.choices.getChoice(index);
        return choice ? choice.value : null;
    }

    onEnd(state) {
        this.status = "answered";
        this.answer = state.value;

        // Re-render prompt
        this.render();

        this.screen.done();
        this.done(state.value);
    }

    onError() {
        this.render("Please enter a valid index");
    }

    /**
     * When user press a key
     */
    onKeypress() {
        const index = this.terminal.readline.line.length ? Number(this.terminal.readline.line) - 1 : 0;

        if (this.opt.choices.getChoice(index)) {
            this.selected = index;
        } else {
            this.selected = undefined;
        }

        this.render();
    }
}
