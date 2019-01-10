const {
    app,
    std
} = adone;

class TestApp extends adone.app.Application {
    async configure() {
        try {
            this.addSubsystem({
                subsystem: std.path.join(__dirname, "not_valid_subsystem.js")
            });
        } catch (err) {
            console.log("incorrect subsystem");
        }
    }

    main() {
        return 0;
    }
}

app.run(TestApp);
