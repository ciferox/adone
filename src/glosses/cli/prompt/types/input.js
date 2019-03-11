const {
    is,
    cli: { prompt: { BasePrompt } },
    runtime: { cli: { style } }
} = adone;

export default class InputPrompt extends BasePrompt {
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
        let appendContent = "";
        let message = this.getQuestion();
        const transformer = this.opt.transformer;
        const isFinal = this.status === "answered";

        if (isFinal) {
            appendContent = this.answer;
        } else {
            appendContent = this.rl.line;
        }

        if (transformer) {
            message += transformer(appendContent, this.answers, { isFinal });
        } else {
            message += isFinal ? style.focus(appendContent) : appendContent;
        }

        if (error) {
            bottomContent = style.error(">> ") + error;
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
        // If user press a key, just clear the default value
        if (this.opt.default) {
            this.opt.default = undefined;
        }

        this.render();
    }
}
