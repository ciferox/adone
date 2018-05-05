const {
    is,
    lodash: _,
    terminal,
    text: { unicode: { symbol } }
} = adone;

const { chalk } = terminal;

/**
 * Get the checkbox.
 * 
 * @param  {Boolean} checked - add a X or not to the checkbox
 * @return {String} Composited checkbox string
 */
const getCheckbox = (checked) => checked ? chalk.green(symbol.radioOn) : symbol.radioOff;

export default class CheckboxPrompt extends terminal.BasePrompt {
    /**
     * Initialize the prompt.
     *
     * @param  {terminal.Terminal} term
     * @param  {Object} questions
     * @param  {Object} answers
     */
    constructor(term, questions, answers) {
        super(term, questions, answers);

        // Default value for the search option
        if (is.undefined(this.opt.search)) {
            this.opt.search = false;
        }

        // Default value for the default option
        if (is.undefined(this.opt.default)) {
            this.opt.default = null;
        }

        if (is.undefined(this.opt.asObject)) {
            this.opt.asObject = false;
        }

        // Doesn't have choices option
        if (!this.opt.choices) {
            this.throwParamError("choices");
        }

        this.value = [];
        if (is.array(this.opt.choices)) {
            this.opt.choices.forEach((choice) => {
                if (choice.checked) {
                    this.value.push("value" in choice ? choice.value : choice.name);
                }
            });
        }

        this.pointer = 0;
        this.firstRender = true;
        this.lastQuery = null;
        this.searching = false;
        this.lastSourcePromise = null;
        this.default = this.opt.default;
        this.opt.default = null;
        this.choices = new terminal.Choices(this.term, [], this.answers);
        this.paginator = new terminal.Paginator(this.term, this.screen);
    }

    /**
     * Start the Inquiry session
     *
     * @param  {Function} callback callback when prompt is done
     * @return {this}
     */
    async _run(callback) {
        this.done = callback;

        await this.executeSource();
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
        }).on("spaceKey", (event) => {
            this.onSpaceKey(event);
        });

        if (!this.opt.search) {
            events.on("numberKey", (event) => {
                this.onNumberKey(event);
            }).on("aKey", (event) => {
                this.onAllKey(event);
            }).on("iKey", (event) => {
                this.onInverseKey(event);
            });
        } else {
            events.on("keypress", (event) => {
                this.onKeypress(event);
            });
        }

        if (this.term.readline.line) {
            this.onKeypress();
        }

        // Init the prompt
        this.term.hideCursor();
        this.render();

        return this;
    }

    /**
     * Execute the source function to get the choices and render them
     */
    async executeSource() {
        let sourcePromise = null;

        this.term.readline.line = _.trim(this.term.readline.line);

        if (this.term.readline.line === this.lastQuery) {
            return;
        }

        if (is.function(this.opt.search)) {
            sourcePromise = await this.opt.search(this.answers, this.term.readline.line);
        } else if (this.opt.search === true) {
            const input = this.term.readline.line || "";
            if (input === "") {
                sourcePromise = this.opt.choices;
            } else {
                const fuzzy = new adone.text.Fuzzy(this.opt.choices, {
                    threshold: 0.5,
                    keys: ["name"]
                });
                sourcePromise = fuzzy.search(input);
            }
        } else {
            sourcePromise = this.opt.choices;
        }

        this.lastQuery = this.term.readline.line;
        this.lastSourcePromise = sourcePromise;

        this.searching = true;
        const choices = await sourcePromise;
        if (this.lastSourcePromise !== sourcePromise) {
            return;
        }
        this.searching = false;

        this.choices = new terminal.Choices(this.term, choices, this.answers);

        this.choices.forEach((choice) => {
            // Is the current choice included in the current checked choices
            if (_.findIndex(this.value, _.isEqual.bind(null, choice.value)) !== -1) {
                this.toggleChoice(choice, true);
            } else {
                this.toggleChoice(choice, false);
            }

            if (this.default) {
                // Is the current choice included in the default values
                if (_.findIndex(this.default, _.isEqual.bind(null, choice.value)) !== -1) {
                    this.toggleChoice(choice, true);
                }
            }
        });

        // Reset the pointer to select the first choice
        this.pointer = 0;
        this.render();
        this.default = null;
        this.firstRender = false;

        return sourcePromise;
    }

    /**
     * Render the prompt
     *
     * @param  {Object} error
     */
    render(error) {
        // Render question
        let message = this.getQuestion();
        let bottomContent = "";

        // Answered
        if (this.status === "answered") {
            message += chalk.cyan(this.selection.join(", "));
            return this.screen.render(message, bottomContent);
        }

        // No search query is entered before
        if (this.firstRender) {
            // If the search is enabled
            if (this.opt.search) {
                message += `(Press ${chalk.cyan.bold("<space>")} to select, ` + "or type anything to filter the list)";
            } else {
                message += `(Press ${chalk.cyan.bold("<space>")} to select, ${chalk.cyan.bold("<a>")} to toggle all, ${chalk.cyan.bold("<i>")} to invert selection)`;
            }
        }

        // If the search is enabled
        if (this.opt.search) {
            // Print the current search query
            message += this.term.readline.line;
        }

        // Searching mode
        if (this.searching) {
            message += `\n  ${chalk.cyan("Searching...")}`;

            // No choices
        } else if (!this.choices.length) {
            message += `\n  ${chalk.yellow("No results...")}`;

            // Has choices
        } else {
            const choicesStr = this.renderChoices(this.choices, this.pointer);
            const indexPosition = this.choices.indexOf(this.choices.getChoice(this.pointer));
            message += `\n${this.paginator.paginate(choicesStr, indexPosition, this.opt.pageSize)}`;
        }

        if (error) {
            bottomContent = chalk.red(">> ") + error;
        }

        this.screen.render(message, bottomContent);
    }

    /**
     * A callback function for the event:
     * When the user press `Enter` key
     *
     * @param {Object} state
     */
    onEnd(state) {
        this.status = "answered";

        // Rerender prompt (and clean subline error)
        this.render();

        this.screen.done();
        this.term.showCursor();
        this.done(state.value);
    }

    /**
     * A callback function for the event:
     * When something wrong happen
     *
     * @param {Object} state
     */
    onError(state) {
        this.render(state.isValid);
    }

    /**
     * Get the current values of the selected choices
     *
     * @return {Array}
     */
    getCurrentValue() {
        const choices = this.choices.filter((choice) => Boolean(choice.checked) && !choice.disabled);
        this.selection = _.map(choices, "short");
        const result = _.map(choices, "value");
        return this.opt.asObject ? adone.lodash.zipObject(result, (new Array(result.length)).fill(true)) : result;
    }

    /**
     * A callback function for the event:
     * When the user press `Up` key
     */
    onUpKey() {
        const len = this.choices.realLength;
        this.pointer = (this.pointer > 0) ? this.pointer - 1 : len - 1;
        this.render();
    }

    /**
     * A callback function for the event:
     * When the user press `Down` key
     */
    onDownKey() {
        const len = this.choices.realLength;
        this.pointer = this.pointer < len - 1 ? this.pointer + 1 : 0;
        this.render();
    }

    /**
     * A callback function for the event:
     * When the user press a number key
     */
    onNumberKey(input) {
        if (input <= this.choices.realLength) {
            this.pointer = input - 1;
            this.toggleChoice(this.choices.getChoice(this.pointer));
        }

        this.render();
    }

    /**
     * A callback function for the event:
     * When the user press `Space` key
     */
    onSpaceKey() {
        // When called no results
        if (!this.choices.getChoice(this.pointer)) {
            return;
        }

        this.toggleChoice(this.choices.getChoice(this.pointer));
        this.render();
    }

    /**
     * A callback function for the event:
     * When the user press 'a' key
     */
    onAllKey() {
        const shouldBeChecked = Boolean(
            this.choices.find((choice) => choice.type !== "separator" && !choice.checked)
        );

        this.choices.forEach((choice) => {
            if (choice.type !== "separator") {
                choice.checked = shouldBeChecked;
            }
        });

        this.render();
    }

    /**
     * A callback function for the event:
     * When the user press `i` key
     */
    onInverseKey() {
        this.choices.forEach((choice) => {
            if (choice.type !== "separator") {
                choice.checked = !choice.checked;
            }
        });

        this.render();
    }

    /**
     * A callback function for the event:
     * When the user press any key
     */
    onKeypress() {
        this.executeSource();
        this.render();
    }

    /**
     * Toggle (check/uncheck) a specific choice
     *
     * @param {Boolean} checked if not specified the status will be toggled
     * @param {Object}  choice
     */
    toggleChoice(choice, checked) {
        // Default value for checked
        if (is.undefined(checked)) {
            checked = !choice.checked;
        }

        // Remove the choice's value from the checked values
        _.remove(this.value, _.isEqual.bind(null, choice.value));

        choice.checked = false;

        // Is the choice checked
        if (checked) {
            this.value.push(choice.value);
            choice.checked = true;
        }
    }

    /**
     * Render the checkbox choices
     *
     * @param  {Array}  choices
     * @param  {Number} pointer the position of the pointer
     * @return {String} rendered content
     */
    renderChoices(choices, pointer) {
        let output = "";
        let separatorOffset = 0;

        // Foreach choice
        choices.forEach((choice, index) => {
            // Is a separator
            if (choice.type === "separator") {
                separatorOffset++;
                output += ` ${choice}\n`;
                return;
            }

            // Is the choice disabled
            if (choice.disabled) {
                separatorOffset++;
                output += ` - ${choice.name}`;
                output += ` (${is.string(choice.disabled) ? choice.disabled : "Disabled"})`;
            } else {
                // Is the current choice is the selected choice
                if (index - separatorOffset === pointer) {
                    output += chalk.cyan(symbol.pointer);
                    output += `${getCheckbox(choice.checked)} `;
                    output += chalk.cyan(choice.name);
                } else {
                    output += ` ${getCheckbox(choice.checked)} ${choice.name}`;
                }
            }

            output += "\n";
        });

        return output.replace(/\n$/, "");
    }
}
