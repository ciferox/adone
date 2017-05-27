adone.run({
    main() {
        adone.terminal.prompt([
            {
                type: "password",
                message: "Enter a password",
                name: "password1"
            },
            {
                type: "password",
                message: "Enter a masked password",
                name: "password2",
                mask: "*"
            }
        ]).then((answers) => {
            adone.log(JSON.stringify(answers, null, "  "));
        });
    }
});
