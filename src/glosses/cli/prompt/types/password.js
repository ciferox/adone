const {
    is,
    cli: { chalk, prompt: { BasePrompt } }
} = adone;

export default class PasswordPrompt extends BasePrompt {
    /**
     * Start the Inquiry session
     * @param  {Function} cb      Callback when prompt is done
     * @return {this}
     */
    _run(cb) {
        this.done = cb;

        const events = this.observe();

        events.on("line", async (input) => {
            input = this.filterInput(input);
            const state = await this.validate(input);
            if (state.isValid === true) {
                events.destroy();
                return this.onEnd(state);
            }
            return this.onError(state);
        });

        if (this.opt.mask) {
            events.on("keypress", (event) => {
                this.onKeypress(event);
            });
        }

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
            message += this.opt.mask ? chalk.cyan(this._mask(this.answer)) : chalk.italic.dim("[hidden]");
        } else if (this.opt.mask) {
            message += this._mask(this.rl.line || "", this.opt.mask);
        } else {
            message += chalk.italic.dim("[input is hidden] ");
        }

        if (error) {
            bottomContent = `\n${chalk.red(">> ")}${error}`;
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
        this.status = "answered";
        this.answer = state.value;

        // Re-render prompt
        this.render();

        this.screen.done();
        this.done(state.value);
    }

    onError(state) {
        this.render(state.isValid);
    }

    onKeypress() {
        this.render();
    }

    _mask(input) {
        input = String(input);
        const maskChar = adone.is.string(this.opt.mask) ? this.opt.mask : "*";
        if (input.length === 0) {
            return "";
        }

        if (this.opt.strength) {
            const bar = new Array(Math.ceil(input.length)).join(maskChar);
            const strength = require("zxcvbn")(input);

            switch (strength.score) {
                case 1:
                    return chalk.red(bar);
                case 2:
                    return chalk.yellow(bar);
                case 3:
                    return chalk[is.windows ? "blue" : "cyan"](bar);
                case 4:
                    return chalk.green(bar);
                default: {
                    return bar;
                }
            }
        }
        return new Array(input.length + 1).join(maskChar);
    }
}
