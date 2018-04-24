const {
    app,
    std
} = adone;

class TestApp extends adone.app.Application {
    async configure() {
        this.addSubsystem({
            subsystem: std.path.join(__dirname, "valid_subsystem.js")
        });
    }

    main() {
        return 0;
    }
}

app.run(TestApp);
