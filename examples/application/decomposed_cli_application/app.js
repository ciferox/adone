const {
    app,
    std: { path }
} = adone;

const {
    DMainCliCommand,
    DApplication
} = app;

@DApplication({
    subsystems: [
        {
            name: "math",
            description: "Operations on numbers over various fields",
            subsystem: path.resolve(__dirname, "math"),
            transpile: true
        },
        {
            name: "info",
            description: "Some info",
            subsystem: path.resolve(__dirname, "info"),
            transpile: true
        }
    ]
})
class MyCLI extends app.CliApplication {
    @DMainCliCommand()
    main() {
        console.log("hello");
    }
}

app.runCli(MyCLI);
