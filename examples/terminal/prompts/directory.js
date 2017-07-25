adone.run({
    main() {
        adone.terminal.prompt().run([
            {
                type: "directory",
                name: "path",
                message: "In what directory would like to perform this action?",
                basePath: "./node_modules"
            }
        ], (answers) => {
            adone.log(JSON.stringify(answers, null, "  "));
        });

    }
});
