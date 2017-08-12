const { is, Terminal } = adone;
const observe = require("../events");

export default class InputPrompt extends Terminal.BasePrompt {
    /**
     * Start the Inquiry session
     * @param  {Function} cb      Callback when prompt is done
     * @return {this}
     */
    _run(cb) {
        this.done = cb;

        // Once user confirm (enter key)
        const events = observe(this.terminal);
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
        let bottomContent = "";
        let message = this.getQuestion();

        if (this.status === "answered") {
            message += this.terminal.cyan(this.answer);
        } else {
            message += this.terminal.readline.line;
        }

        if (error) {
            bottomContent = this.terminal.red(">> ") + error;
        }

        this.screen.render(message, bottomContent);
    }

    /**
     * When user press `enter` key
     */
    filterInput(input) {
        if (!input) {
            return is.nil(this.opt.default) ? "" : this.opt.default;
        }
        return input;
    }

    onEnd(state) {
        this.answer = state.value;
        this.status = "answered";

        // Re-render prompt
        this.render();

        this.screen.done();
        this.done(state.value);
    }

    onError(state) {
        this.render(state.isValid);
    }

    /**
     * When user press a key
     */
    onKeypress() {
        this.render();
    }
}
