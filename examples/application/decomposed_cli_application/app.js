const {
    app,
    std: { path }
} = adone;

const {
    MainCommandMeta,
    ApplicationMeta
} = app;

@ApplicationMeta({
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
class MyCLI extends app.Application {
    @MainCommandMeta()
    main() {
        console.log("hello");
    }
}

app.run(MyCLI, {
    useArgs: true
});
