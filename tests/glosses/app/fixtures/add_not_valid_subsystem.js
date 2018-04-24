const {
    app
} = adone;

class AppSubsystem {
    configure() {
        adone.log("configure");
    }

    initialize() {
        adone.log("initialize");
    }

    uninitialize() {
        adone.log("uninitialize");
    }
}

class TestApp extends adone.app.Application {
    async configure() {
        try {
            this.addSubsystem({
                subsystem: new AppSubsystem()
            });
        } catch (err) {
            adone.log("incorrect subsystem");
        }
    }

    main() {
        return 0;
    }
}

app.run(TestApp);
