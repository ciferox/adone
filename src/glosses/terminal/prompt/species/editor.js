const { Terminal } = adone;
const observe = require("../events");
const rx = require("rx");

export default class EditorPrompt extends Terminal.BasePrompt {
    /**
     * Start the Inquiry session
     * @param  {Function} cb      Callback when prompt is done
     * @return {this}
     */
    _run(cb) {
        this.done = cb;

        this.editorResult = new rx.Subject();

        // Open Editor on "line" (Enter Key)
        const events = observe(this.terminal);
        this.lineSubscription = events.line.forEach(() => {
            // Pause Readline to prevent stdin and stdout from being modified while the editor is showing
            this.terminal.readline.pause();
            this.startExternalEditor().then((result) => {
                this.terminal.readline.resume();
                this.editorResult.onNext(result);
            }, (err) => {
                this.terminal.readline.resume();
                this.editorResult.onError(err);
            });
        });

        // Trigger Validation when editor closes
        const validation = this.handleSubmitEvents(this.editorResult);
        validation.success.forEach(this.onEnd.bind(this));
        validation.error.forEach(this.onError.bind(this));

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
        this.editorResult.dispose();
        this.lineSubscription.dispose();
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
