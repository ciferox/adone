const {
    is,
    lodash: _,
    cli: { chalk, prompt: { BasePrompt, Choices, Paginator, Separator } }
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
            display = chalk.cyan(display);
        }
        output += display;
    });

    return output;
};

export default class RawlistPrompt extends BasePrompt {
    constructor(manager, question, answers) {
        super(manager, question, answers);
        if (!this.opt.choices) {
            this.throwParamError("choices");
        }
        // Normalize choices
        this.choices = new Choices(this.term, this.opt.choices, answers);

        this.opt.validChoices = this.choices.filter(Separator.exclude);

        this.selected = 0;
        this.rawDefault = 0;

        _.extend(this.opt, {
            validate(val) {
                return !is.nil(val);
            }
        });

        const def = this.opt.default;
        if (_.isNumber(def) && def >= 0 && def < this.choices.realLength) {
            this.selected = this.rawDefault = def;
        } else if (!_.isNumber(def) && !is.nil(def)) {
            const index = _.findIndex(this.choices.realChoices, ({ value }) => value === def);
            this.selected = this.rawDefault = Math.max(index, 0);
        }

        // Make sure no default is set (so it won't be printed)
        this.opt.default = null;

        this.paginator = new Paginator(this.term);
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

        events.on("normalizedUpKey", (event) => {
            this.onUpKey(event);
        }).on("normalizedDownKey", (event) => {
            this.onDownKey(event);
        }).on("line", async (input) => {
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
            message += chalk.cyan(this.answer);
        } else {
            const choicesStr = renderChoices(this.term, this.choices, this.selected);
            message += this.paginator.paginate(choicesStr, this.selected, this.opt.pageSize);
            message += "\n  Answer: ";
        }

        message += this.rl.line;

        if (error) {
            bottomContent = `\n${chalk.red(">> ")}${error}`;
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

        const choice = this.choices.getChoice(index);
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

    onUpKey() {
        const len = this.choices.realLength;
        this.selected = (this.selected > 0) ? this.selected - 1 : len - 1;
        this.render();
    }

    onDownKey() {
        const len = this.choices.realLength;
        this.selected = (this.selected < len - 1) ? this.selected + 1 : 0;
        this.render();
    }

    /**
     * When user press a key
     */
    onKeypress(event) {
        if (["up", "down"].includes(event.key.name)) {
            return;
        }
        const index = this.rl.line.length ? Number(this.rl.line) - 1 : 0;

        if (this.choices.getChoice(index)) {
            this.selected = index;
        } else {
            this.selected = undefined;
        }

        this.render();
    }
}
