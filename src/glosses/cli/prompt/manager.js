const {
    is,
    lodash: _,
    cli: { prompt: { type } }
} = adone;

export default class Manager {
    constructor(term) {
        this.term = term;
        const input = term.input;
        const output = new adone.stream.MuteStream();
        output.pipe(term.output);


        this.rl = adone.std.readline.createInterface({
            terminal: true,
            input,
            output
        });
        this.rl.resume();
        this.answers = {};
    }

    async run(questions) {
        try {
            this.rlHistorySize = this.rl.historySize;
            this.rl.historySize = 0; // disable history in case of unexpected behaviour

            // Make sure questions is an array.
            if (is.plainObject(questions)) {
                questions = [questions];
            }

            const answers = this.answers;

            for (const q of questions) {
                const question = _.clone(q);
                // Default type to input
                if (!type[question.type]) {
                    question.type = "input";
                }

                if (question.when === false) {
                    continue;
                }

                if (is.function(question.when)) {
                    // eslint-disable-next-line no-await-in-loop
                    if (!(await question.when(answers))) {
                        continue;
                    }
                }
                if (is.function(question.message)) {
                    // eslint-disable-next-line no-await-in-loop
                    question.message = await question.message(answers);
                }
                if (is.function(question.default)) {
                    // eslint-disable-next-line no-await-in-loop
                    question.default = await question.default(answers);
                }
                if (is.function(question.choices)) {
                    // eslint-disable-next-line no-await-in-loop
                    question.choices = await question.choices(answers);
                }

                const PromptClass = type[question.type];
                this.activePrompt = new PromptClass(this, question, answers);
                // eslint-disable-next-line no-await-in-loop
                const answer = await this.activePrompt.run();
                _.set(answers, question.name, answer);
            }

            return this.onCompletion();
        } catch (err) {
            throw err;
        } finally {
            this.rl.historySize = this.rlHistorySize; // disable history in case of unexpected behaviour

            // Bugfix: sync cursor position
            await this.term.syncCursor();
        }
    }

    forceClose() {
        this.close();
        console.log("");
    }

    close() {
        this.rl.output.unmute();

        if (this.activePrompt && is.function(this.activePrompt.close)) {
            this.activePrompt.close();
        }

        if (!is.null(this.rl)) {
            this.rl.output.end();
            this.rl.pause();
            this.rl.close();
        }
    }

    onCompletion() {
        this.close();

        return this.answers;
    }
}
