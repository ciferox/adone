adone.app.run({
    async main() {
        const requireLetterAndNumber = (value) => {
            if (/\w/.test(value) && /\d/.test(value)) {
                return true;
            }
            return "Password need to have at least a letter and a number";
        };

        const answers = await adone.cli.prompt([
            {
                type: "password",
                message: "Enter a password",
                name: "password1",
                validate: requireLetterAndNumber
            },
            {
                type: "password",
                message: "Enter a masked password",
                name: "password2",
                mask: "*",
                validate: requireLetterAndNumber
            },
            {
                type: "password",
                message: "Enter a strength-masked password",
                name: "password3",
                strength: true,
                mask: "█",
                validate: requireLetterAndNumber
            }
        ]);
        console.log(JSON.stringify(answers, null, "  "));
    }
});
