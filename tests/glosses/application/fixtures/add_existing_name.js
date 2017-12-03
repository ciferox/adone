const {
    application
} = adone;

class AppSubsystem extends application.Subsystem {
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

class TestApp extends adone.application.Application {
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

application.run(TestApp);
