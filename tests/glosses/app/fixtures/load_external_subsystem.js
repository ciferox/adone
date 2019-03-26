const {
    app
} = adone;

const {
    mainCommand
} = app;

class TestApp extends adone.app.Application {
    @mainCommand({
        arguments: ["path"],
        options: [{
            name: "--transpile"
        }, {
            name: "--name",
            nargs: 1
        }, {
            name: "--description",
            nargs: 1
        }, {
            name: "--print-meta"
        }]
    })
    async run(args, opts) {
        console.log("main");
        const info = await this.loadSubsystem(args.get("path"), opts.getAll(true));
        if (opts.get("print-meta")) {
            console.log("name", info.name);
            console.log("description", info.description);
        }
        return 0;
    }
}

app.run(TestApp, {
    useArgs: true
});
