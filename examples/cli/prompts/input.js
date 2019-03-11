adone.app.run({
    async main() {
        const questions = [
            {
                name: "first_name",
                message: "What's your first name"
            },
            {
                name: "last_name",
                message: "What's your last name",
                default() {
                    return "Doe";
                }
            },
            {
                type: "input",
                name: "fav_color",
                message: "What's your favorite color",
                transformer(color, answers, flags) {
                    const text = adone.cli.chalkify(color)(color);
                    if (flags.isFinal) {
                        return `${text}!`;
                    }
                    return text;
                }
            },
            {
                name: "phone",
                message: "What's your phone number",
                validate(value) {
                    const pass = value.match(/^([01]{1})?[-.\s]?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})\s?((?:#|ext\.?\s?|x\.?\s?){1}(?:\d+)?)?$/i);
                    if (pass) {
                        return true;
                    }

                    return "Please enter a valid phone number";
                }
            }
        ];

        const answers = await adone.runtime.cli.prompt(questions);
        console.log(JSON.stringify(answers, null, "  "));
    }
});
