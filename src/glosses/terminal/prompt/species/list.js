const {
    is,
    terminal
} = adone;

const {
    chalk
} = terminal;

/**
 * Function for rendering list choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */
const listRender = (terminal, choices, pointer) => {
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
            output += ` (${is.string(choice.disabled) ? choice.disabled : "Disabled"})`;
            output += "\n";
            return;
        }

        const isSelected = (i - separatorOffset === pointer);
        let line = (isSelected ? `${adone.text.unicode.symbol.pointer} ` : "  ") + choice.name;
        if (isSelected) {
            line = chalk.cyan(line);
        }
        output += `${line} \n`;
    });

    return output.replace(/\n$/, "");
};

export default class ListPrompt extends terminal.BasePrompt {
    constructor(term, question, answers) {
        super(term, question, answers);
        if (!this.opt.choices) {
            this.throwParamError("choices");
        }
        this.choices = new terminal.Choices(this.term, this.opt.choices, answers);

        this.firstRender = true;
        this.selected = 0;

        const def = this.opt.default;

        // If def is a Number, then use as index. Otherwise, check for value.
        if (is.number(def) && def >= 0 && def < this.choices.realLength) {
            this.selected = def;
        } else if (!is.number(def) && !is.nil(def)) {
            const index = this.choices.realChoices.findIndex(({ value }) => value === def);
            this.selected = Math.max(index, 0);
        }

        // Make sure no default is set (so it won't be printed)
        this.opt.default = null;

        this.paginator = new terminal.Paginator(this.term, this.screen);
    }

    /**
     * Start the Inquiry session
     * @param  {Function} cb      Callback when prompt is done
     * @return {this}
     */
    _run(cb) {
        this.done = cb;

        const events = this.observe();

        events.on("normalizedUpKey", (event) => {
            this.onUpKey(event);
        }).on("normalizedDownKey", (event) => {
            this.onDownKey(event);
        }).on("numberKey", (event) => {
            this.onNumberKey(event);
        }).on("line", async () => {
            events.destroy();

            const value = this.getCurrentValue();
            let res;
            try {
                res = await this.opt.filter(value);
            } catch (err) {
                res = err;
            }
            this.onSubmit(res);
        });

        // Init the prompt
        this.term.hideCursor();
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
            message += chalk.dim("(Use arrow keys)");
        }

        // Render choices or answer depending on the state
        if (this.status === "answered") {
            message += chalk.cyan(this.choices.getChoice(this.selected).short);
        } else {
            const choicesStr = listRender(this.term, this.choices, this.selected);
            const indexPosition = this.choices.indexOf(this.choices.getChoice(this.selected));
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
        this.term.showCursor();
        this.done(value);
    }

    getCurrentValue() {
        return this.choices.getChoice(this.selected).value;
    }

    /**
     * When user press a key
     */
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

    onNumberKey(input) {
        if (input <= this.choices.realLength) {
            this.selected = input - 1;
        }
        this.render();
    }
}
