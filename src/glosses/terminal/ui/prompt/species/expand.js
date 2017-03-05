import adone from "adone";
import BasePrompt from "./base";
import Paginator from "../paginator";
const { vendor: { lodash: _ }, terminal } = adone;
const observe = require("../events");


/**
 * Function for rendering checkbox choices
 * @param  {String} pointer Selected key
 * @return {String}         Rendered content
 */
const renderChoices = (choices, pointer) => {
    let output = "";

    choices.forEach((choice) => {
        output += "\n  ";

        if (choice.type === "separator") {
            output += ` ${choice}`;
            return;
        }

        let choiceStr = `${choice.key}) ${choice.name}`;
        if (pointer === choice.key) {
            choiceStr = terminal.style.cyan(choiceStr);
        }
        output += choiceStr;
    });

    return output;
};

export default class ExpandPrompt extends BasePrompt {
    constructor(question, answers) {
        super(question, answers);
        if (!this.opt.choices) {
            this.throwParamError("choices");
        }

        this.validateChoices(this.opt.choices);

        // Add the default `help` (/expand) option
        this.opt.choices.push({
            key: "h",
            name: "Help, list all options",
            value: "help"
        });

        this.opt.validate = function (choice) {
            if (choice == null) {
                return "Please enter a valid command";
            }

            return choice !== "help";
        };

        // Setup the default string (capitalize the default key)
        this.opt.default = this.generateChoicesString(this.opt.choices, this.opt.default);

        this.paginator = new Paginator();
    }

    /**
     * Start the Inquiry session
     * @param  {Function} cb      Callback when prompt is done
     * @return {this}
     */
    _run(cb) {
        this.done = cb;

        // Save user answer and update prompt to show selected option.
        const events = observe();
        const validation = this.handleSubmitEvents(
            events.line.map(this.getCurrentValue.bind(this))
        );
        validation.success.forEach(this.onSubmit.bind(this));
        validation.error.forEach(this.onError.bind(this));
        this.keypressObs = events.keypress.takeUntil(validation.success)
            .forEach(this.onKeypress.bind(this));

        // Init the prompt
        this.render();

        return this;
    }

    /**
     * Render the prompt to screen
     * @return {Prompt} self
     */
    render(error, hint) {
        let message = this.getQuestion();
        let bottomContent = "";

        if (this.status === "answered") {
            message += terminal.style.cyan(this.answer);
        } else if (this.status === "expanded") {
            const choicesStr = renderChoices(this.opt.choices, this.selectedKey);
            message += this.paginator.paginate(choicesStr, this.selectedKey, this.opt.pageSize);
            message += "\n  Answer: ";
        }

        message += terminal.readline.line;

        if (error) {
            bottomContent = terminal.style.red(">> ") + error;
        }

        if (hint) {
            bottomContent = terminal.style.cyan(">> ") + hint;
        }

        this.screen.render(message, bottomContent);
    }

    getCurrentValue(input) {
        if (!input) {
            input = this.rawDefault;
        }
        const selected = this.opt.choices.where({ key: input.toLowerCase().trim() })[0];
        if (!selected) {
            return null;
        }

        return selected.value;
    }

    /**
     * Generate the prompt choices string
     * @return {String}  Choices string
     */
    getChoices() {
        let output = "";

        this.opt.choices.forEach((choice) => {
            output += "\n  ";

            if (choice.type === "separator") {
                output += " " + choice;
                return;
            }

            let choiceStr = `${choice.key}) ${choice.name}`;
            if (this.selectedKey === choice.key) {
                choiceStr = terminal.style.cyan(choiceStr);
            }
            output += choiceStr;
        });

        return output;
    }

    onError(state) {
        if (state.value === "help") {
            this.selectedKey = "";
            this.status = "expanded";
            this.render();
            return;
        }
        this.render(state.isValid);
    }

    /**
     * When user press `enter` key
     */
    onSubmit(state) {
        this.status = "answered";
        const choice = this.opt.choices.where({ value: state.value })[0];
        this.answer = choice.short || choice.name;

        // Re-render prompt
        this.render();
        this.screen.done();
        this.done(state.value);
    }

    /**
     * When user press a key
     */
    onKeypress() {
        this.selectedKey = terminal.readline.line.toLowerCase();
        const selected = this.opt.choices.where({ key: this.selectedKey })[0];
        if (this.status === "expanded") {
            this.render();
        } else {
            this.render(null, selected ? selected.name : null);
        }
    }

    /**
     * Validate the choices
     * @param {Array} choices
     */
    validateChoices(choices) {
        let formatError;
        const errors = [];
        const keymap = {};
        choices.filter(terminal.Separator.exclude).forEach((choice) => {
            if (!choice.key || choice.key.length !== 1) {
                formatError = true;
            }
            if (keymap[choice.key]) {
                errors.push(choice.key);
            }
            keymap[choice.key] = true;
            choice.key = String(choice.key).toLowerCase();
        });

        if (formatError) {
            throw new Error("Format error: `key` param must be a single letter and is required.");
        }
        if (keymap.h) {
            throw new Error("Reserved key error: `key` param cannot be `h` - this value is reserved.");
        }
        if (errors.length) {
            throw new Error(`Duplicate key error: \`key\` param must be unique. Duplicates: ${
                _.uniq(errors).join(", ")}`);
        }
    }

    /**
     * Generate a string out of the choices keys
     * @param  {Array}  choices
     * @param  {Number} defaultIndex - the choice index to capitalize
     * @return {String} The rendered choices key string
     */
    generateChoicesString(choices, defaultIndex) {
        let defIndex = choices.realLength - 1;
        if (_.isNumber(defaultIndex) && this.opt.choices.getChoice(defaultIndex)) {
            defIndex = defaultIndex;
        }
        const defStr = this.opt.choices.pluck("key");
        this.rawDefault = defStr[defIndex];
        defStr[defIndex] = String(defStr[defIndex]).toUpperCase();
        return defStr.join("");
    }
}
