adone.run({
    main() {
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

        adone.terminal.prompt(questions).then((answers) => {
            adone.log(JSON.stringify(answers, null, "  "));
        });

    }
});
