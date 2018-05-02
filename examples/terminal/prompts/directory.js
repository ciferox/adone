adone.app.run({
    async main() {
        const answers = await adone.runtime.term.prompt().run([
            {
                type: "directory",
                name: "path",
                message: "In what directory would like to perform this action?",
                basePath: "./node_modules"
            }
        ]);
        adone.log(JSON.stringify(answers, null, "  "));
    }
});
