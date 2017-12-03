const {
    application,
    std
} = adone;

class TestApp extends adone.application.Application {
    async configure() {
        this.addSubsystem({
            subsystem: std.path.join(__dirname, "valid_subsystem.js")
        });
    }

    main() {
        return 0;
    }
}

application.run(TestApp);
