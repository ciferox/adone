adone.app.run({
    async main() {
        const questions = [
            {
                type: "confirm",
                name: "really",
                message: "Do you really want to do this?"
            }
        ];

        const answers = await adone.cli.prompt().run(questions);
        console.log(JSON.stringify(answers, null, "  "));
    }
});
