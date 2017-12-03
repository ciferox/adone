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

class Hello extends application.Subsystem {
    configure() {
        adone.log("hello configure");
    }

    initialize() {
        adone.log("hello initialize");
    }

    uninitialize() {
        adone.log("hello uninitialize");
    }
}

class TestApp extends adone.application.Application {
    async configure() {
        this.addSubsystem({
            subsystem: new AppSubsystem(),
            name: "Hello"
        });
        this.addSubsystem({
            subsystem: new Hello()
        });
    }

    main() {
        return 0;
    }
}

application.run(TestApp);
