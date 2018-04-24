adone.app.run({
    main() {
        this.output = [];

        this.questions = [
            {
                type: "input",
                name: "tvShow",
                message: "What's your favorite TV show?"
            },
            {
                type: "confirm",
                name: "askAgain",
                message: "Want to enter another TV show favorite (just hit enter for YES)?",
                default: true
            }
        ];


        this._ask();
    },
    _ask() {
        adone.runtime.term.prompt().run(this.questions).then((answers) => {
            this.output.push(answers.tvShow);
            if (answers.askAgain) {
                this._ask();
            } else {
                adone.log("Your favorite TV Shows:", this.output.join(", "));
            }
        });
    }
});
