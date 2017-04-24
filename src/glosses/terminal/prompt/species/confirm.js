const { vendor: { lodash: _ }, terminal } = adone;
const observe = require("../events");

export default class ConfirmPrompt extends terminal.BasePrompt {
    constructor(question, answers) {
        super(question, answers);
        let rawDefault = true;

        _.extend(this.opt, {
            filter(input) {
                let value = rawDefault;
                if (input != null && input !== "") {
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
        const events = observe();
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

        if (typeof answer === "boolean") {
            message += terminal.cyan(answer ? "Yes" : "No");
        } else {
            message += terminal.readline.line;
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
