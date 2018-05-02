adone.app.run({
    async main() {
        const questions = [
            {
                type: "confirm",
                name: "really",
                message: "Do you really want to do this?"
            }
        ];

        const answers = await adone.runtime.term.prompt().run(questions);
        adone.log(JSON.stringify(answers, null, "  "));
    }
});
