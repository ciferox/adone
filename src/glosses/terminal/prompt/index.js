const { is, vendor: { lodash: _ } } = adone;

export default class Prompt {
    constructor(terminal) {
        this.terminal = terminal;
        this.rl = terminal.readline;
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
                if (!(await question.when(answers))) {
                    continue;
                }
            }
            if (is.function(question.message)) {
                question.message = await question.message(answers);
            }
            if (is.function(question.default)) {
                question.default = await question.default(answers);
            }
            if (is.function(question.choices)) {
                question.choices = await question.choices(answers);
            }

            const Cls = Prompt.prompts[question.type];
            this.activePrompt = new Cls(this.terminal, question, answers);
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

        this.terminal.resetReadline();
        this.terminal.activePrompt = null;
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
    directory: "./species/directory"
}, null, require);
