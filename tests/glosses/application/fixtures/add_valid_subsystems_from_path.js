const {
    application,
    std
} = adone;

class TestApp extends adone.application.Application {
    async configure() {
        await this.addSubsystemsFrom(std.path.join(__dirname, "subsystem"), {
            useFilename: true,
            transpile: true
        });
    }

    main() {
        return 0;
    }
}

application.run(TestApp);
