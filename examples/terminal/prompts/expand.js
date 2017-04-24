adone.terminal.prompt([
    {
        type: "expand",
        message: "Conflict on `file.js`: ",
        name: "overwrite",
        choices: [
            {
                key: "y",
                name: "Overwrite",
                value: "overwrite"
            },
            {
                key: "a",
                name: "Overwrite this one and all next",
                value: "overwrite_all"
            },
            {
                key: "d",
                name: "Show diff",
                value: "diff"
            },
            new adone.terminal.Separator(),
            {
                key: "x",
                name: "Abort",
                value: "abort"
            }
        ]
    }
]).then((answers) => {
    console.log(JSON.stringify(answers, null, "  "));
});
