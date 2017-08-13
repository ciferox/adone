const { Terminal } = adone;

/**
 * Constants
 */
const CHOOSE = "choose this directory";
const BACK = "go back a directory";

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

        const isSelected = (i - separatorOffset === pointer);
        let line = (isSelected ? `${adone.text.unicode.symbol.pointer} ` : "  ") + choice.name;
        if (isSelected) {
            line = terminal.cyan(line);
        }
        output += `${line} \n`;
    });

    return output.replace(/\n$/, "");
};

/**
 * Function for getting list of folders in directory
 * @param  {String} basePath the path the folder to get a list of containing folders
 * @return {Array}           array of folder names inside of basePath
 */
const getDirectories = (basePath) => {
    return adone.std.fs
        .readdirSync(basePath)
        .filter((file) => {
            const stats = adone.std.fs.lstatSync(adone.std.path.join(basePath, file));
            if (stats.isSymbolicLink()) {
                return false;
            }
            const isDir = stats.isDirectory();
            const isNotDotFile = adone.std.path.basename(file).indexOf(".") !== 0;
            return isDir && isNotDotFile;
        })
        .sort();
};

export default class Prompt extends Terminal.BasePrompt {
    constructor(question, answers) {
        super(question, answers);

        if (!this.opt.basePath) {
            this.throwParamError("basePath");
        }

        this.depth = 0;
        this.currentPath = adone.std.path.isAbsolute(this.opt.basePath)
            ? adone.std.path.resolve(this.opt.basePath)
            : adone.std.path.resolve(process.cwd(), this.opt.basePath);
        this.opt.choices = new Terminal.Choices(this.terminal, this.createChoices(this.currentPath), this.answers);
        this.selected = 0;

        this.firstRender = true;

        // Make sure no default is set (so it won't be printed)
        this.opt.default = null;

        this.searchTerm = "";

        this.paginator = new Terminal.Paginator(this.terminal);
    }

    /**
     * Start the Inquiry session
     * @param  {Function} cb      Callback when prompt is done
     * @return {this}
     */
    _run(cb) {
        const self = this;
        self.searchMode = false;
        this.done = cb;

        const events = this.observe();

        events.on("keypress", (event) => {
            this.hideKeyPress(event);
            if (event.key.name === "up" || (!this.searchMode && event.key.name === "k")) {
                return this.onUpKey(event);
            }
            if (event.key.name === "down" || (!self.searchMode && event.key.name === "j")) {
                return this.onDownKey(event);
            }
            if (event.value === "/") {
                return this.onSlashKey(events);
            }
            if (event.value === "-") {
                return this.handleBack(event);
            }
        }).on("line", () => {
            const choice = this.opt.choices.getChoice(self.selected).value;
            if (choice === CHOOSE) {
                events.destroy();
                return this.onSubmit();
            }
            if (choice === BACK) {
                return this.handleBack();
            }
            return this.handleDrill();
        });

        // Init the prompt
        this.terminal.hideCursor();
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
            message += this.terminal.dim("(Use arrow keys)");
        }

        // Render choices or answer depending on the state
        if (this.status === "answered") {
            message += this.terminal.cyan(adone.std.path.relative(this.opt.basePath, this.currentPath));
        } else {
            message += `${this.terminal.bold("\n Current directory: ") + this.opt.basePath}/${this.terminal.cyan(adone.std.path.relative(this.opt.basePath, this.currentPath))}`;
            const choicesStr = listRender(this.terminal, this.opt.choices, this.selected);
            message += `\n${this.paginator.paginate(choicesStr, this.selected, this.opt.pageSize)}`;
            if (this.searchMode) {
                message += (`\nSearch: ${this.searchTerm}`);
            } else {
                message += "\n(Use \"/\" key to search this directory)";
            }
        }

        this.firstRender = false;

        this.screen.render(message);
    }

    /**
     *  when user selects to drill into a folder (by selecting folder name)
     */
    handleDrill() {
        const choice = this.opt.choices.getChoice(this.selected);
        this.depth++;
        this.currentPath = adone.std.path.join(this.currentPath, choice.value);
        this.opt.choices = new Terminal.Choices(this.terminal, this.createChoices(this.currentPath), this.answers);
        this.selected = 0;
        this.render();
    }

    /**
     * when user selects ".. back"
     */
    handleBack() {
        if (this.depth > 0) {
            this.depth--;
            this.currentPath = adone.std.path.dirname(this.currentPath);
            this.opt.choices = new Terminal.Choices(this.terminal, this.createChoices(this.currentPath), this.answers);
            this.selected = 0;
            this.render();
        }
    }

    /**
     * when user selects "choose this folder"
     */
    onSubmit() {
        this.status = "answered";

        // Rerender prompt
        this.render();

        this.screen.done();
        this.terminal.showCursor();
        this.done(adone.std.path.relative(this.opt.basePath, this.currentPath));
    }

    /**
     * When user press a key
     */
    hideKeyPress() {
        if (!this.searchMode) {
            this.render();
        }
    }

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

    onSlashKey(events) {
        this.searchMode = true;
        this.searchTerm = "";
        this.render();

        const alphaNumericRegex = /\w|\.|-/i;

        const endSeach = () => {
            events.removeListener("keypress", keypressHandler); // eslint-disable-line no-use-before-define
            events.removeListener("line", lineHandler); // eslint-disable-line no-use-before-define
            this.searchMode = false;
            this.render();
        };

        const lineHandler = () => {
            let index = -1;
            for (let i = 0; i < this.opt.choices.realLength; i++) {
                const item = this.opt.choices.realChoices[i].name.toLowerCase();
                if (item.indexOf(this.searchTerm) === 0) {
                    index = i;
                }
            }
            if (index >= 0) {
                this.selected = index;
            }
            endSeach();
        };

        const keypressHandler = (event) => {
            const isBackspace = event.key.name === "backspace";
            const isAlphanumeric = alphaNumericRegex.test(event.value);
            if (!isBackspace && !isAlphanumeric) {
                return;
            }
            if (isBackspace && this.searchTerm.length > 0) {
                this.searchTerm = this.searchTerm.slice(0, -1);
            } else if (event.value) {
                this.searchTerm += event.value;
            }
            if (this.searchTerm === "") {
                endSeach();
                return;
            }
            for (let index = 0; index < this.opt.choices.realLength; index++) {
                const item = this.opt.choices.realChoices[index].name.toLowerCase();
                if (item.indexOf(this.searchTerm) === 0) {
                    this.selected = index;
                    break;
                }
            }
            this.render();
        };

        events.on("keypress", keypressHandler).on("line", lineHandler);
    }

    /**
     * Helper to create new choices based on previous selection.
     */
    createChoices(basePath) {
        const choices = getDirectories(basePath);
        if (choices.length > 0) {
            choices.push(new Terminal.Separator(this.terminal));
        }
        choices.push(CHOOSE);
        if (this.depth > 0) {
            choices.push(new Terminal.Separator(this.terminal));
            choices.push(BACK);
            choices.push(new Terminal.Separator(this.terminal));
        }
        return choices;
    }
}
