adone.app.run({
    async main() {
        const questions = [
            {
                type: "datetime",
                name: "date",
                message: "Choose the date",
                intervals: {
                    hour: 2
                },
                values: {
                    minute: [0, 10, 20, 30],
                    second: [1, 2, 3, 5, 8, 13, 21, 34]
                },
                format: ["DD", ".", "MM", ".", "YYYY", " ", "HH", ":", "mm", ":", "ss", " ", "Do", " ", "MMMM"],
                default: adone.datetime("10.08.2017 00:00:01", "DD.MM.YYYY HH:mm:ss"),
                max: adone.datetime("23.08.2017 18:00", "DD.MM.YYYY HH:mm"),
                min: adone.datetime("05.04.2017 18:00", "DD.MM.YYYY HH:mm")
            }
        ];

        const answers = await adone.runtime.term.prompt().run(questions);
        console.log(answers);
    }
});
