const {
    is,
    vendor: { lodash: _ }
} = adone;

export default class Prompt {
    constructor(term) {
        this.term = term;
        this.rl = term.readline;
        this.rl.resume();
        this.answers = {};
    }

    async run(questions) {
        // Make sure questions is an array.
        if (is.plainObject(questions)) {
            questions = [questions];
        }

        const answers = this.answers;

        for (const q of questions) {
            const question = _.clone(q);
            // Default type to input
            if (!Prompt.prompts[question.type]) {
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

            const Cls = Prompt.prompts[question.type];
            this.activePrompt = new Cls(this.term, question, answers);
            // eslint-disable-next-line no-await-in-loop
            const answer = await this.activePrompt.run();
            _.set(answers, question.name, answer);
        }

        return this.onCompletion(answers);
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

        this.term.resetReadline();
        this.term.activePrompt = null;
    }

    onCompletion(answers) {
        this.close();

        return answers;
    }
}

Prompt.prompts = adone.lazify({
    list: "./species/list",
    input: "./species/input",
    confirm: "./species/confirm",
    rawlist: "./species/rawlist",
    expand: "./species/expand",
    checkbox: "./species/checkbox",
    password: "./species/password",
    editor: "./species/editor",
    autocomplete: "./species/autocomplete",
    directory: "./species/directory",
    datetime: "./species/datetime"
}, null, require);
