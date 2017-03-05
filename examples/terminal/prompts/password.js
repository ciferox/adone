adone.terminal.prompt([
    {
        type: "password",
        message: "Enter your git password",
        name: "password"
    }
]).then((answers) => {
    console.log(JSON.stringify(answers, null, "  "));
});
