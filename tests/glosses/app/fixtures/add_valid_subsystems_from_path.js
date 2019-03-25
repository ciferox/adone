const {
    app,
    std
} = adone;

class TestApp extends adone.app.Application {
    async onConfigure() {
        await this.addSubsystemsFrom(std.path.join(__dirname, "subsystems"), {
            useFilename: true,
            transpile: true
        });
    }

    run() {
        return 0;
    }
}

app.run(TestApp);
