import adone from "adone";
import BasePrompt from "./base";
import Choices from "../choices";
import Paginator from "../paginator";
const rx = require("rx");
const observe = require("../events");
const { terminal } = adone;

const path = require("path");
const fs = require("fs");

/**
 * Constants
 */
const CHOOSE = "choose this directory";
const BACK = "go back a directory";

const findIndex = (term) => {
    let item;
    for (let i = 0; i < this.opt.choices.realLength; i++) {
        item = this.opt.choices.realChoices[i].name.toLowerCase();
        if (item.indexOf(term) === 0) {
            return i;
        }
    }
    return -1;
};

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
        let line = (isSelected ? `${adone.text.figure.pointer} ` : "  ") + choice.name;
        if (isSelected) {
            line = terminal.style.cyan(line);
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
    return fs
        .readdirSync(basePath)
        .filter((file) => {
            const stats = fs.lstatSync(path.join(basePath, file));
            if (stats.isSymbolicLink()) {
                return false;
            }
            const isDir = stats.isDirectory();
            const isNotDotFile = path.basename(file).indexOf(".") !== 0;
            return isDir && isNotDotFile;
        })
        .sort();
};

export default class Prompt extends BasePrompt {
    constructor(question, answers) {
        super(question, answers);

        if (!this.opt.basePath) {
            this.throwParamError("basePath");
        }

        this.depth = 0;
        this.currentPath = path.isAbsolute(this.opt.basePath) ? path.resolve(this.opt.basePath) : path.resolve(process.cwd(), this.opt.basePath);
        this.opt.choices = new Choices(this.createChoices(this.currentPath), this.answers);
        this.selected = 0;

        this.firstRender = true;

        // Make sure no default is set (so it won't be printed)
        this.opt.default = null;

        this.searchTerm = "";

        this.paginator = new Paginator();
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
        const alphaNumericRegex = /\w|\.|\-/i;
        const events = observe();

        const keyUps = events.keypress.filter((e) => {
            return e.key.name === "up" || (!self.searchMode && e.key.name === "k");
        }).share();

        const keyDowns = events.keypress.filter((e) => {
            return e.key.name === "down" || (!self.searchMode && e.key.name === "j");
        }).share();

        const keySlash = events.keypress.filter((e) => {
            return e.value === "/";
        }).share();

        const keyMinus = events.keypress.filter((e) => {
            return e.value === "-";
        }).share();

        const alphaNumeric = events.keypress.filter((e) => {
            return e.key.name === "backspace" || alphaNumericRegex.test(e.value);
        }).share();

        const searchTerm = keySlash.flatMap((md) => {
            self.searchMode = true;
            self.searchTerm = "";
            self.render();
            const end$ = new rx.Subject();
            const done$ = rx.Observable.merge(events.line, end$);
            return alphaNumeric.map((e) => {
                if (e.key.name === "backspace" && self.searchTerm.length) {
                    self.searchTerm = self.searchTerm.slice(0, -1);
                } else if (e.value) {
                    self.searchTerm += e.value;
                }
                if (self.searchTerm === "") {
                    end$.onNext(true);
                }
                return self.searchTerm;
            })
                .takeUntil(done$)
                .doOnCompleted(() => {
                    self.searchMode = false;
                    self.render();
                    return false;
                });
        }).share();

        const outcome = this.handleSubmit(events.line);
        outcome.drill.forEach(this.handleDrill.bind(this));
        outcome.back.forEach(this.handleBack.bind(this));
        keyUps.takeUntil(outcome.done).forEach(this.onUpKey.bind(this));
        keyDowns.takeUntil(outcome.done).forEach(this.onDownKey.bind(this));
        keyMinus.takeUntil(outcome.done).forEach(this.handleBack.bind(this));
        events.keypress.takeUntil(outcome.done).forEach(this.hideKeyPress.bind(this));
        searchTerm.takeUntil(outcome.done).forEach(this.onKeyPress.bind(this));
        outcome.done.forEach(this.onSubmit.bind(this));

        // Init the prompt
        terminal.hideCursor();
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
            message += terminal.style.dim("(Use arrow keys)");
        }


        // Render choices or answer depending on the state
        if (this.status === "answered") {
            message += terminal.style.cyan(path.relative(this.opt.basePath, this.currentPath));
        } else {
            message += `${terminal.style.bold("\n Current directory: ") + this.opt.basePath}/${terminal.style.cyan(path.relative(this.opt.basePath, this.currentPath))}`;
            const choicesStr = listRender(this.opt.choices, this.selected);
            message += `\n${this.paginator.paginate(choicesStr, this.selected, this.opt.pageSize)}`;
        }
        if (this.searchMode) {
            message += (`\nSearch: ${this.searchTerm}`);
        } else {
            message += "\n(Use \"/\" key to search this directory)";
        }

        this.firstRender = false;

        this.screen.render(message);
    }

    /**
     * When user press `enter` key
     */
    handleSubmit(e) {
        const self = this;
        const obx = e.map(() => {
            return self.opt.choices.getChoice(self.selected).value;
        }).share();

        const done = obx.filter((choice) => {
            return choice === CHOOSE;
        }).take(1);

        const back = obx.filter((choice) => {
            return choice === BACK;
        }).takeUntil(done);

        const drill = obx.filter((choice) => {
            return choice !== BACK && choice !== CHOOSE;
        }).takeUntil(done);

        return {
            done,
            back,
            drill
        };
    }

    /**
     *  when user selects to drill into a folder (by selecting folder name)
     */
    handleDrill() {
        const choice = this.opt.choices.getChoice(this.selected);
        this.depth++;
        this.currentPath = path.join(this.currentPath, choice.value);
        this.opt.choices = new Choices(this.createChoices(this.currentPath), this.answers);
        this.selected = 0;
        this.render();
    }

    /**
     * when user selects ".. back"
     */
    handleBack() {
        if (this.depth > 0) {
            const choice = this.opt.choices.getChoice(this.selected);
            this.depth--;
            this.currentPath = path.dirname(this.currentPath);
            this.opt.choices = new Choices(this.createChoices(this.currentPath), this.answers);
            this.selected = 0;
            this.render();
        }
    }

    /**
     * when user selects "choose this folder"
     */
    onSubmit(value) {
        this.status = "answered";

        // Rerender prompt
        this.render();

        this.screen.done();
        terminal.showCursor();
        this.done(path.relative(this.opt.basePath, this.currentPath));
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

    onSlashKey(e) {
        this.render();
    }

    onKeyPress(e) {
        const index = findIndex.call(this, this.searchTerm);
        if (index >= 0) {
            this.selected = index;
        }
        this.render();
    }

    /**
     * Helper to create new choices based on previous selection.
     */
    createChoices(basePath) {
        const choices = getDirectories(basePath);
        if (choices.length > 0) {
            choices.push(new terminal.Separator());
        }
        choices.push(CHOOSE);
        if (this.depth > 0) {
            choices.push(new terminal.Separator());
            choices.push(BACK);
            choices.push(new terminal.Separator());
        }
        return choices;
    }
}
