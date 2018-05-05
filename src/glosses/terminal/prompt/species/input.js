const {
    is,
    terminal
} = adone;

const {
    chalk
} = terminal;

export default class InputPrompt extends terminal.BasePrompt {
    _run(cb) {
        this.done = cb;

        // Once user confirm (enter key)
        const events = this.observe();

        events.on("line", async (input) => {
            input = this.filterInput(input);
            const state = await this.validate(input);
            if (state.isValid === true) {
                events.destroy();
                return this.onEnd(state);
            }
            return this.onError(state);
        }).on("keypress", (event) => {
            this.onKeypress(event);
        });

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
        const transformer = this.opt.transformer;

        if (this.status === "answered") {
            message += chalk.cyan(this.answer);
        } else if (transformer) {
            message += transformer(this.term.readline.line, this.answers);
        } else {
            message += this.term.readline.line;
        }

        if (error) {
            bottomContent = chalk.red(">> ") + error;
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
