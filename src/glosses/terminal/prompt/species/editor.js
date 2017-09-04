const {
    terminal: { Terminal },
    promise
} = adone;

export default class EditorPrompt extends Terminal.BasePrompt {
    /**
     * Start the Inquiry session
     * @param  {Function} cb      Callback when prompt is done
     * @return {this}
     */
    _run(cb) {
        this.done = cb;

        // Open Editor on "line" (Enter Key)
        const events = this.observe();

        events.on("line", async () => {
            this.terminal.readline.pause();
            try {
                const result = await this.startExternalEditor();
                this.terminal.readline.resume();
                // resume required some delay o_O
                // Without a delay it requires a new line when I use vim or nano
                await promise.delay(10);
                const state = await this.validate(result);
                if (state.isValid === true) {
                    events.destroy();
                    return this.onEnd(state);
                }
                return this.onError(state);
            } catch (err) {
                this.terminal.readline.resume();
                // ?
                return this.onError({ isValid: err.message });
            }
        });

        // Prevents default from being printed on screen (can look weird with multiple lines)
        this.currentText = this.opt.default;
        this.opt.default = null;

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
            message += this.terminal.dim("Received");
        } else {
            message += this.terminal.dim("Press <enter> to launch your preferred editor.");
        }

        if (error) {
            bottomContent = this.terminal.red(">> ") + error;
        }

        this.screen.render(message, bottomContent);
    }

    async startExternalEditor() {
        return adone.util.Editor.edit({ text: this.currentText });
    }

    onEnd(state) {
        this.answer = state.value;
        this.status = "answered";
        // Re-render prompt
        this.render();
        this.screen.done();
        this.done(this.answer);
    }

    onError(state) {
        this.render(state.isValid);
    }
}
