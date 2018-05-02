const fuzzy = require("fuzzy");

adone.app.run({
    async main() {
        const answers = await adone.runtime.term.prompt().run([{
            type: "checkbox",
            name: "colors",
            message: "Enter colors (embedded fuzzy searcher)",
            pageSize: 10,
            search: true,
            highlight: true,
            default: ["yellow", "red", { name: "black" }],
            choices: [
                { name: "The red color", value: "red", short: "red", disabled: false },
                { name: "The blue color", value: "blue", short: "blue", disabled: true },
                { name: "The green color", value: "green", short: "green", disabled: false },
                { name: "The yellow color", value: "yellow", short: "yellow", disabled: false },
                { name: "The black color", value: { name: "black" }, short: "black", disabled: false },
                { name: "The cyanBright color", value: { name: "cyanBright" }, short: "cyanBright", disabled: false }
            ],
            validate(answer) {
                if (answer.length === 0) {
                    return "You must choose at least one color.";
                }

                return true;
            }
        },
        {
            type: "checkbox",
            name: "colors",
            message: "Enter colors (custom searcher)",
            pageSize: 10,
            highlight: true,
            default: ["yellow", "red", { name: "black" }],
            choices: [
                { name: "The red color", value: "red", short: "red", disabled: false },
                { name: "The blue color", value: "blue", short: "blue", disabled: true },
                { name: "The green color", value: "green", short: "green", disabled: false },
                { name: "The yellow color", value: "yellow", short: "yellow", disabled: false },
                { name: "The black color", value: { name: "black" }, short: "black", disabled: false },
                { name: "The cyanBright color", value: { name: "cyanBright" }, short: "cyanBright", disabled: false }
            ],
            validate(answer) {
                if (answer.length === 0) {
                    return "You must choose at least one color.";
                }

                return true;
            },
            search(answersSoFar, input) {
                input = input || "";

                return new Promise(((resolve) => {
                    const fuzzyResult = fuzzy.filter(input, this.choices, {
                        extract(item) {
                            return item.name;
                        }
                    });

                    const data = fuzzyResult.map((element) => {
                        return element.original;
                    });

                    resolve(data);
                }));
            }
        }]);
        adone.log(answers.colors);
    }
});
