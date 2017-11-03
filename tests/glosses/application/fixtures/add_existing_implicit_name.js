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
        await this.addSubsystem({
            subsystem: new AppSubsystem(),
            name: "Hello"
        });
        await this.addSubsystem({
            subsystem: new Hello()
        });
    }

    main() {
        return 0;
    }
}

application.run(TestApp);
