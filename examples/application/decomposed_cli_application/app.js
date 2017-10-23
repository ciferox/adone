const {
    application: { CliApplication },
    std: { path }
} = adone;

const {
    MainCommand,
    ExternalSubsystem
} = CliApplication;

@ExternalSubsystem({
    name: "math",
    description: "Operations on numbers over various fields",
    subsystem: path.resolve(__dirname, "math"),
    transpile: true
})
@ExternalSubsystem({
    name: "info",
    description: "Some info",
    subsystem: path.resolve(__dirname, "info"),
    transpile: true
})
class MyCLI extends CliApplication {
    @MainCommand()
    main() {
        console.log("hello");
    }
}

adone.application.runCli(MyCLI);
