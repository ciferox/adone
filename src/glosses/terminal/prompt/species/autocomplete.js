const { terminal } = adone;
const observe = require("../events");
const ansiEscapes = require("ansi-escapes");

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

        const isSelected = (i - separatorOffset === pointer);
        let line = (isSelected ? `${adone.text.unicode.symbol.pointer} ` : "  ") + choice.name;

        if (isSelected) {
            line = terminal.cyan(line);
        }
        output += `${line} \n`;
    });

    return output.replace(/\n$/, "");
};

export default class AutocompletePrompt extends terminal.BasePrompt {
    constructor(question, answers) {
        super(question, answers);

        if (!this.opt.source) {
            this.throwParamError("source");
        }

        this.currentChoices = [];

        this.firstRender = true;
        this.selected = 0;

        // Make sure no default is set (so it won't be printed)
        this.opt.default = null;

        this.paginator = new terminal.Paginator();
        this.rl = terminal.readline;
    }

    /**
     * Start the Inquiry session
     * @param  {Function} cb      Callback when prompt is done
     * @return {this}
     */
    _run(cb) {
        this.done = cb;

        if (this.rl.history instanceof Array) {
            this.rl.history = [];
        }

        const events = observe();
        const dontHaveAnswer = () => !this.answer;

        events.line.takeWhile(dontHaveAnswer).forEach(this.onSubmit.bind(this));
        events.keypress.takeWhile(dontHaveAnswer).forEach(this.onKeypress.bind(this));

        //call once at init
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
            content += terminal.dim(`(Use arrow keys or type to search${suggestText})`);
        }
        // Render choices or answer depending on the state
        if (this.status === "answered") {
            content += terminal.cyan(this.shortAnswer || this.answerName || this.answer);
        } else if (this.searching) {
            content += this.rl.line;
            bottomContent += `  ${terminal.dim("Searching...")}`;
        } else if (this.currentChoices.length) {
            const choicesStr = listRender(this.currentChoices, this.selected);
            content += this.rl.line;
            bottomContent += this.paginator.paginate(choicesStr, this.selected, this.opt.pageSize);
        } else {
            content += this.rl.line;
            bottomContent += `  ${terminal.yellow("No results...")}`;
        }

        if (error) {
            bottomContent += `\n${terminal.red(">> ")}${error}`;
        }

        this.firstRender = false;

        this.screen.render(content, bottomContent);
    }

    /**
     * When user press `enter` key
     */
    onSubmit(line) {
        if (typeof this.opt.validate === "function" && this.opt.suggestOnly) {
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
            choice.value = this.rl.line;
            this.answer = line;
            this.answerName = line;
            this.shortAnswer = line;
            this.rl.line = "";
        } else {
            choice = this.currentChoices.getChoice(this.selected);
            this.answer = choice.value;
            this.answerName = choice.name;
            this.shortAnswer = choice.short;
        }


        this.status = "answered";

        // Rerender prompt
        this.render();

        this.screen.done();

        this.done(choice.value);
    }

    search(searchTerm) {
        const self = this;
        self.selected = 0;

        //only render searching state after first time
        if (self.searchedOnce) {
            self.searching = true;
            self.currentChoices = new terminal.Choices([]);
            self.render(); //now render current searching state
        } else {
            self.searchedOnce = true;
        }

        self.lastSearchTerm = searchTerm;
        const thisPromise = self.opt.source(self.answers, searchTerm);

        //store this promise for check in the callback
        self.lastPromise = thisPromise;

        return thisPromise.then(function inner(choices) {
            //if another search is triggered before the current search finishes, don't set results
            if (thisPromise !== self.lastPromise) {
                return;
            }

            choices = new terminal.Choices(choices.filter((choice) => {
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

    /**
     * When user type
     */
    onKeypress(e) {
        let len;
        const keyName = (e.key && e.key.name) || undefined;

        if (keyName === "tab" && this.opt.suggestOnly) {
            this.rl.write(terminal.terminfo.cursorLeft());
            const autoCompleted = this.currentChoices.getChoice(this.selected).value;
            this.rl.write(ansiEscapes.cursorForward(autoCompleted.length));
            this.rl.line = autoCompleted;
            this.render();
        } else if (keyName === "down") {
            len = this.currentChoices.length;
            this.selected = (this.selected < len - 1) ? this.selected + 1 : 0;
            this.ensureSelectedInRange();
            this.render();
            this.rl.output.write(terminal.terminfo.up(2));
        } else if (keyName === "up") {
            len = this.currentChoices.length;
            this.selected = (this.selected > 0) ? this.selected - 1 : len - 1;
            this.ensureSelectedInRange();
            this.render();
        } else {
            this.render(); //render input automatically
            //Only search if input have actually changed, not because of other keypresses
            if (this.lastSearchTerm !== this.rl.line) {
                this.search(this.rl.line); //trigger new search
            }
        }
    }
}
