adone.terminal.prompt([
    {
        type: "directory",
        name: "path",
        message: "In what directory would like to perform this action?",
        basePath: "./node_modules"
    }
], (answers) => {
    console.log(JSON.stringify(answers, null, "  "));
});
