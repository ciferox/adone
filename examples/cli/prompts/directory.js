adone.app.run({
    async main() {
        const answers = await adone.cli.prompt().run([
            {
                type: "directory",
                name: "path",
                message: "In what directory would like to perform this action?",
                basePath: "./node_modules"
            }
        ]);
        console.log(JSON.stringify(answers, null, "  "));
    }
});
