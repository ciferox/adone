const {
    error,
    is,
    terminal,
    cli: { kit }
} = adone;

const {
    chalk
} = terminal;

/**
 * Function for rendering list choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */
const listRender = (term, choices, pointer) => {
    let output = "";
    let separatorOffset = 0;

    choices.forEach((choice, i) => {
        if (choice.type === "separator") {
            separatorOffset++;
            output += `  ${choice}\n`;
            return;
        }

        const isSelected = (i - separatorOffset === pointer);
        let line = (isSelected ? `${adone.text.unicode.symbol.pointer} ` : "  ") + choice.name;

        if (isSelected) {
            line = kit.theme.focus(line);
        }
        output += `${line} \n`;
    });

    return output.replace(/\n$/, "");
};

export default class AutocompletePrompt extends terminal.BasePrompt {
    constructor(term, question, answers) {
        super(term, question, answers);

        if (!this.opt.source) {
            this.throwParamError("source");
        }

        this.currentChoices = [];

        this.firstRender = true;
        this.selected = 0;

        // Make sure no default is set (so it won't be printed)
        this.opt.default = null;

        this.paginator = new terminal.Paginator(this.term);
        this.rl = this.term.readline;
    }

    /**
     * Start the Inquiry session
     * @param  {Function} cb      Callback when prompt is done
     * @return {this}
     */
    _run(cb) {
        this.done = (answer) => {
            events.destroy(); // eslint-disable-line no-use-before-define
            cb(answer);
        };

        if (this.rl.history instanceof Array) {
            this.rl.history = [];
        }

        const events = this.observe();
        const dontHaveAnswer = () => !this.answer;

        events.on("line", (event) => {
            if (dontHaveAnswer()) {
                return this.onSubmit(event);
            }
        }).on("keypress", (event) => {
            if (dontHaveAnswer()) {
                return this.onKeypress(event);
            }
        });

        // call once at init
        this.search(null);

        return this;
    }

    /**
     * Render the prompt to screen
     * @return {Prompt} self
     */
    render(error) {
        // Render question
        let content = this.getQuestion();
        let bottomContent = "";

        if (this.firstRender) {
            const suggestText = this.opt.suggestOnly ? ", tab to autocomplete" : "";
            content += kit.theme.inactive(`(Use arrow keys or type to search${suggestText})`);
        }
        // Render choices or answer depending on the state
        if (this.status === "answered") {
            content += kit.theme.primary(this.shortAnswer || this.answerName || this.answer);
        } else if (this.searching) {
            content += kit.theme.focus(this.rl.line);
            bottomContent += `  ${kit.theme.inactive("Searching...")}`;
        } else if (this.currentChoices.length) {
            const choicesStr = listRender(this.term, this.currentChoices, this.selected);
            content += kit.theme.focus(this.rl.line);
            bottomContent += this.paginator.paginate(choicesStr, this.selected, this.opt.pageSize);
        } else {
            content += kit.theme.focus(this.rl.line);
            bottomContent += `  ${chalk.yellow("No results...")}`;
        }

        if (error) {
            bottomContent += `\n${kit.theme.error(">> ")}${error}`;
        }

        this.firstRender = false;

        this.screen.render(content, bottomContent);
    }

    /**
     * When user press `enter` key
     */
    onSubmit(line) {
        if (is.function(this.opt.validate) && this.opt.suggestOnly) {
            const validationResult = this.opt.validate(line);
            if (validationResult !== true) {
                this.render(validationResult || "Enter something, tab to autocomplete!");
                return;
            }
        }

        let choice = {};
        if (this.currentChoices.length <= this.selected && !this.opt.suggestOnly) {
            this.rl.write(line);
            this.search(line);
            return;
        }

        if (this.opt.suggestOnly) {
            choice.value = line || this.rl.line;
            this.answer = line || this.rl.line;
            this.answerName = line || this.rl.line;
            this.shortAnswer = line || this.rl.line;
            this.rl.line = "";
        } else {
            choice = this.currentChoices.getChoice(this.selected);
            this.answer = choice.value;
            this.answerName = choice.name;
            this.shortAnswer = choice.short;
        }

        if (is.function(this.opt.filter)) {
            const processResult = (value) => {
                choice.value = value;
                this.answer = value;

                if (this.opt.suggestOnly) {
                    this.shortAnswer = value;
                }

                this.status = "answered";
                // Rerender prompt
                this.render();
                this.screen.done();
                this.done(choice.value);
            };

            const result = this.opt.filter(choice.value);

            if (is.promise(result)) {
                result.then((value) => {
                    processResult(value);
                });
            } else {
                processResult(result);
            }
        }
    }

    search(searchTerm) {
        const self = this;
        self.selected = 0;

        //only render searching state after first time
        if (self.searchedOnce) {
            self.searching = true;
            self.currentChoices = new terminal.Choices(this.term, []);
            self.render(); //now render current searching state
        } else {
            self.searchedOnce = true;
        }

        self.lastSearchTerm = searchTerm;
        const thisPromise = new Promise((resolve) => resolve(self.opt.source(self.answers, searchTerm)));

        //store this promise for check in the callback
        self.lastPromise = thisPromise;

        return thisPromise.then((choices) => {
            //if another search is triggered before the current search finishes, don't set results
            if (thisPromise !== self.lastPromise) {
                return;
            }

            if (!is.array(choices)) {
                throw new error.IllegalStateException("Source should return an array");
            }

            choices = new terminal.Choices(this.term, choices.filter((choice) => {
                return choice.type !== "separator";
            }));

            self.currentChoices = choices;
            self.searching = false;
            self.render();
        });
    }

    ensureSelectedInRange() {
        const selectedIndex = Math.min(this.selected, this.currentChoices.length); //not above currentChoices length - 1
        this.selected = Math.max(selectedIndex, 0); //not below 0
    }

    onKeypress(e) {
        let len;
        const keyName = (e.key && e.key.name) || undefined;
        // log("got", keyName, this.opt.suggestOnly);
        if (keyName === "tab") {
            if (this.opt.suggestOnly && this.currentChoices.getChoice(this.selected)) {
                const autoCompleted = this.currentChoices.getChoice(this.selected).value;
                this.rl.clearLine();
                this.rl.write(autoCompleted);
            } else {
                this.rl.line = this.rl.line.replace(/\t/m, "");
            }
            this.render();
        } else if (keyName === "down") {
            len = this.currentChoices.length;
            this.selected = (this.selected < len - 1) ? this.selected + 1 : 0;
            this.ensureSelectedInRange();
            this.render();
        } else if (keyName === "up") {
            len = this.currentChoices.length;
            this.selected = (this.selected > 0) ? this.selected - 1 : len - 1;
            this.ensureSelectedInRange();
            this.render();
        } else {
            this.render(); // render input automatically
            //Only search if input have actually changed, not because of other keypresses
            if (this.lastSearchTerm !== this.rl.line) {
                this.search(this.rl.line); //trigger new search
            }
        }
    }
}
