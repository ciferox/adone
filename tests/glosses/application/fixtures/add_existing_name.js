const {
    app
} = adone;

class AppSubsystem extends app.Subsystem {
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
        this.addSubsystem({
            subsystem: new AppSubsystem(),
            name: "hello"
        });
        this.addSubsystem({
            subsystem: new AppSubsystem(),
            name: "hello"
        });
    }

    main() {
        return 0;
    }
}

app.run(TestApp);
