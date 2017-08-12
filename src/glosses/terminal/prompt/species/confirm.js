const { is, vendor: { lodash: _ }, Terminal } = adone;
const observe = require("../events");

export default class ConfirmPrompt extends Terminal.BasePrompt {
    constructor(terminal, question, answers) {
        super(terminal, question, answers);
        let rawDefault = true;

        _.extend(this.opt, {
            filter(input) {
                let value = rawDefault;
                if (!is.nil(input) && input !== "") {
                    value = /^y(es)?/i.test(input);
                }
                return value;
            }
        });

        if (_.isBoolean(this.opt.default)) {
            rawDefault = this.opt.default;
        }

        this.opt.default = rawDefault ? "Y/n" : "y/N";

        return this;
    }

    /**
     * Start the Inquiry session
     * @param  {Function} cb   Callback when prompt is done
     * @return {this}
     */
    _run(cb) {
        this.done = cb;

        // Once user confirm (enter key)
        const events = observe(this.terminal);
        events.keypress.takeUntil(events.line).forEach(this.onKeypress.bind(this));

        events.line.take(1).forEach(this.onEnd.bind(this));

        // Init
        this.render();

        return this;
    }

    /**
     * Render the prompt to screen
     * @return {Prompt} self
     */
    render(answer) {
        let message = this.getQuestion();

        if (is.boolean(answer)) {
            message += this.terminal.cyan(answer ? "Yes" : "No");
        } else {
            message += this.terminal.readline.line;
        }

        this.screen.render(message);

        return this;
    }

    /**
     * When user press `enter` key
     */
    onEnd(input) {
        this.status = "answered";

        const output = this.opt.filter(input);
        this.render(output);

        this.screen.done();
        this.done(output);
    }

    /**
     * When user press a key
     */
    onKeypress() {
        this.render();
    }
}
