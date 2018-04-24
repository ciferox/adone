const {
    app,
    std
} = adone;

class TestApp extends adone.app.Application {
    async configure() {
        await this.addSubsystemsFrom(std.path.join(__dirname, "subsystems"), {
            useFilename: true,
            transpile: true
        });
    }

    main() {
        return 0;
    }
}

app.run(TestApp);
