
import BasePrompt from "./base";
const { terminal } = adone;
const observe = require("../events");

const mask = (input) => {
    input = String(input);
    if (input.length === 0) {
        return "";
    }

    return new Array(input.length + 1).join("*");
};

export default class PasswordPrompt extends BasePrompt {
    /**
     * Start the Inquiry session
     * @param  {Function} cb      Callback when prompt is done
     * @return {this}
     */
    _run(cb) {
        this.done = cb;

        const events = observe();

        // Once user confirm (enter key)
        const submit = events.line.map(this.filterInput.bind(this));

        const validation = this.handleSubmitEvents(submit);
        validation.success.forEach(this.onEnd.bind(this));
        validation.error.forEach(this.onError.bind(this));

        events.keypress.takeUntil(validation.success).forEach(this.onKeypress.bind(this));

        // Init
        this.render();

        return this;
    }

    /**
     * Render the prompt to screen
     * @return {Prompt} self
     */
    render(error) {
        let message = this.getQuestion();
        let bottomContent = "";

        if (this.status === "answered") {
            message += terminal.style.cyan(mask(this.answer));
        } else {
            message += mask(terminal.readline.line || "");
        }

        if (error) {
            bottomContent = `\n${terminal.style.red(">> ")}${error}`;
        }

        this.screen.render(message, bottomContent);
    }

    /**
     * When user press `enter` key
     */
    filterInput(input) {
        if (!input) {
            return this.opt.default == null ? "" : this.opt.default;
        }
        return input;
    }

    onEnd(state) {
        this.status = "answered";
        this.answer = state.value;

        // Re-render prompt
        this.render();

        this.screen.done();
        this.done(state.value);
    }

    onError(state) {
        this.render(state.isValid);
        terminal.readline.output.unmute();
    }

    /**
     * When user type
     */
    onKeypress() {
        this.render();
    }
}
