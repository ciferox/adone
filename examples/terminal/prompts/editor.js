adone.run({
    main() {
        this.questions = [
            {
                type: "editor",
                name: "bio",
                message: "Please write a short bio of at least 3 lines.",
                validate(text) {
                    if (text.split("\n").length < 3) {
                        return "Must be at least 3 lines.";
                    }

                    return true;
                }
            }
        ];

        adone.terminal.prompt().run(this.questions).then((answers) => {
            adone.log(JSON.stringify(answers, null, "  "));
        });
    }
});
