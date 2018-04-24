const {
    app
} = adone;

const {
    DMainCliCommand
} = app;

class TestApp extends adone.app.CliApplication {
    @DMainCliCommand({
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
    async main(args, opts) {
        adone.log("main");
        const info = await this.loadSubsystem(args.get("path"), opts.getAll(true));
        if (opts.get("print-meta")) {
            adone.log("name", info.name);
            adone.log("description", info.description);
        }
        return 0;
    }
}

app.runCli(TestApp);
