const {
    is,
    fs,
    terminal,
    std
} = adone;

const {
    chalk
} = terminal;

/**
 * Constants
 */
const CHOOSE = "choose this directory";
const BACK = "..";
const CURRENT = ".";

/**
 * Function for rendering list choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */
const listRender = (choices, pointer) => {
    let output = "";
    let separatorOffset = 0;

    choices.forEach((choice, index) => {
        if (choice.type === "separator") {
            separatorOffset++;
            output += `  ${choice}\n`;
            return;
        }

        const isSelected = (index - separatorOffset === pointer);
        let line = (isSelected ? `${adone.text.unicode.symbol.pointer} ` : "  ");

        if (choice.isDirectory) {
            if (choice.name === ".") {
                line += "📂  ";
            } else {
                line += "📁  ";
            }
        }
        if (choice.isFile) {
            line += "📄  ";
        }
        line += choice.name;
        if (isSelected) {
            line = chalk.cyan(line);
        }
        output += `${line} \n`;
    });

    return output.replace(/\n$/, "");
};

/**
 * Function for getting list of folders in directory
 * @param  {String} basePath                the path the folder to get a list of containing folders
 * @param  {Boolean} [displayHidden=false]  set to true if you want to get hidden files
 * @param  {Boolean} [displayFiles=false]  set to true if you want to get files
 * @return {Array}                          array of folder names inside of basePath
 */
const getDirectoryContent = (basePath, displayHidden, displayFiles) => {
    return std.fs
        .readdirSync(basePath)
        .filter((file) => {
            try {
                const stats = std.fs.lstatSync(std.path.join(basePath, file));
                if (stats.isSymbolicLink()) {
                    return false;
                }
                const isDir = stats.isDirectory();
                const isFile = stats.isFile() && displayFiles;
                if (displayHidden) {
                    return isDir || displayFiles;
                }
                const isNotDotFile = std.path.basename(file).indexOf(".") !== 0;
                return (isDir || isFile) && isNotDotFile;
            } catch (error) {
                return false;
            }
        })
        .sort();
};

const updateChoices = (choices, basePath) => {
    choices.forEach((choice, i) => {
        if (is.undefined(choice.type)) {
            try {
                const stats = fs.lstatSync(std.path.join(basePath, choice.value));
                choice.isDirectory = stats.isDirectory();
                choice.isFile = stats.isFile();
                choices[i] = choice;
            } catch (error) {
                // console.log(error);
            }
        }
    });
    return choices;
};

export default class DirectoryPrompt extends terminal.BasePrompt {
    constructor(question, answers) {
        super(question, answers);

        if (!this.opt.basePath) {
            this.throwParamError("basePath");
        }

        try {
            this.opt.displayHidden = this.opt.options.displayHidden;
        } catch (e) {
            this.opt.displayHidden = false;
        }

        try {
            this.opt.displayFiles = this.opt.options.displayFiles;
        } catch (e) {
            this.opt.displayFiles = false;
        }

        this.depth = 0;
        this.currentPath = std.path.isAbsolute(this.opt.basePath)
            ? std.path.resolve(this.opt.basePath)
            : std.path.resolve(process.cwd(), this.opt.basePath);
        this.root = std.path.parse(this.currentPath).root;
        this.choices = new terminal.Choices(this.term, this.createChoices(this.currentPath), this.answers);
        this.selected = 0;

        this.firstRender = true;

        // Make sure no default is set (so it won't be printed)
        this.opt.default = null;

        this.searchTerm = "";

        this.paginator = new terminal.Paginator(this.term);
    }

    /**
     * Start the Inquiry session
     * @param  {Function} cb      Callback when prompt is done
     * @return {this}
     */
    _run(cb) {
        this.searchMode = false;
        this.done = cb;

        const events = this.observe();

        events.on("keypress", (event) => {
            this.hideKeyPress(event);
            if (event.key.name === "up" || (!this.searchMode && event.key.name === "k")) {
                return this.onUpKey(event);
            }
            if (event.key.name === "down" || (!this.searchMode && event.key.name === "j")) {
                return this.onDownKey(event);
            }
            if (event.value === "/" && !this.searchMode) {
                return this.onSlashKey(events);
            }
            if (event.value === "-" && !this.searchMode) {
                return this.handleBack(event);
            }
            if (event.value === "." && !this.searchMode) {
                return this.onSubmit();
            }
        }).on("line", () => {
            const choice = this.choices.getChoice(this.selected).value;
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
        this.term.hideCursor();
        this.render();

        return this;
    }

    /**
     * Render the prompt to screen
     * @return {Prompt} self
     */
    render() {
        updateChoices(this.choices, this.opt.basePath);
        // Render question
        let message = this.getQuestion();

        // Render choices or answer depending on the state
        if (this.status === "answered") {
            message += chalk.cyan(this.currentPath);
        } else {
            message += chalk.bold("\n Current directory: ") + chalk.cyan(std.path.resolve(this.opt.basePath, this.currentPath));
            message += chalk.bold("\n");
            const choicesStr = listRender(this.choices, this.selected);
            message += `\n${this.paginator.paginate(choicesStr, this.selected, this.opt.pageSize)}`;
            if (this.searchMode) {
                message += (`\nSearch: ${this.searchTerm}`);
            } else {
                message += chalk.dim('\n(Use "/" key to search this directory)');
                message += chalk.dim('\n(Use "-" key to navigate to the parent folder');
            }
        }
        this.screen.render(message);
    }

    /**
     *  when user selects to drill into a folder (by selecting folder name)
     */
    handleDrill() {
        const choice = this.choices.getChoice(this.selected);
        this.currentPath = std.path.join(this.currentPath, choice.value);
        this.choices = new terminal.Choices(this.term, this.createChoices(this.currentPath), this.answers);
        this.selected = 0;
        this.render();
    }

    /**
     * when user selects ".. back"
     */
    handleBack() {
        this.currentPath = std.path.dirname(this.currentPath);
        this.choices = new terminal.Choices(this.term, this.createChoices(this.currentPath), this.answers);
        this.selected = 0;
        this.render();
    }

    /**
     * when user selects "choose this folder"
     */
    onSubmit() {
        this.status = "answered";

        // Rerender prompt
        this.render();

        this.screen.done();
        this.term.showCursor();
        this.done(std.path.relative(this.opt.basePath, this.currentPath));
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
        const len = this.choices.realLength;
        this.selected = (this.selected > 0) ? this.selected - 1 : len - 1;
        this.render();
    }

    onDownKey() {
        const len = this.choices.realLength;
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
            for (let i = 0; i < this.choices.realLength; i++) {
                const item = this.choices.realChoices[i].name.toLowerCase();
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
            for (let index = 0; index < this.choices.realLength; index++) {
                const item = this.choices.realChoices[index].name.toLowerCase();
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
        const choices = getDirectoryContent(basePath, this.opt.displayHidden, this.opt.displayFiles);
        if (basePath !== this.root) {
            choices.unshift(BACK);
        }
        choices.unshift(CURRENT);
        if (choices.length > 0) {
            choices.push(this.term.separator());
        }
        choices.push(CHOOSE);
        choices.push(this.term.separator());
        return choices;
    }
}
