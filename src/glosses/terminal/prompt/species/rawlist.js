const { vendor: { lodash: _ }, terminal } = adone;
const observe = require("../events");

/**
 * Function for rendering list choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */
const renderChoices = (choices, pointer) => {
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

export default class RawlistPrompt extends terminal.BasePrompt {
    constructor(question, answers) {
        super(question, answers);
        if (!this.opt.choices) {
            this.throwParamError("choices");
        }

        this.opt.validChoices = this.opt.choices.filter(terminal.Separator.exclude);

        this.selected = 0;
        this.rawDefault = 0;

        _.extend(this.opt, {
            validate(val) {
                return val != null;
            }
        });

        const def = this.opt.default;
        if (_.isNumber(def) && def >= 0 && def < this.opt.choices.realLength) {
            this.selected = this.rawDefault = def;
        }

    // Make sure no default is set (so it won't be printed)
        this.opt.default = null;

        this.paginator = new terminal.Paginator();
    }

    /**
     * Start the Inquiry session
     * @param  {Function} cb      Callback when prompt is done
     * @return {this}
     */
    _run(cb) {
        this.done = cb;

    // Once user confirm (enter key)
        const events = observe();
        const submit = events.line.map(this.getCurrentValue.bind(this));

        const validation = this.handleSubmitEvents(submit);
        validation.success.forEach(this.onEnd.bind(this));
        validation.error.forEach(this.onError.bind(this));

        events.keypress.takeUntil(validation.success).forEach(this.onKeypress.bind(this));

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
            message += terminal.cyan(this.answer);
        } else {
            const choicesStr = renderChoices(this.opt.choices, this.selected);
            message += this.paginator.paginate(choicesStr, this.selected, this.opt.pageSize);
            message += "\n  Answer: ";
        }

        message += terminal.readline.line;

        if (error) {
            bottomContent = `\n${terminal.red(">> ")}${error}`;
        }

        this.screen.render(message, bottomContent);
    }

    /**
     * When user press `enter` key
     */
    getCurrentValue(index) {
        if (index == null || index === "") {
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
        const index = terminal.readline.line.length ? Number(terminal.readline.line) - 1 : 0;

        if (this.opt.choices.getChoice(index)) {
            this.selected = index;
        } else {
            this.selected = undefined;
        }

        this.render();
    }
}
