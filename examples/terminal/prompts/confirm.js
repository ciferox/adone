adone.application.run({
    main() {
        const questions = [
            {
                type: "confirm",
                name: "really",
                message: "Do you really want to do this?"
            }
        ];

        adone.terminal.prompt().run(questions).then((answers) => {
            adone.log(JSON.stringify(answers, null, "  "));
        });

    }
});
