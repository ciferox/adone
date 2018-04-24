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

class Hello extends app.Subsystem {
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

class TestApp extends adone.app.Application {
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

app.run(TestApp);
