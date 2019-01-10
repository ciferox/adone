const {
    app
} = adone;

class AppSubsystem extends app.Subsystem {
    configure() {
        console.log("configure");
    }

    initialize() {
        console.log("initialize");
    }

    uninitialize() {
        console.log("uninitialize");
    }
}

class Hello extends app.Subsystem {
    configure() {
        console.log("hello configure");
    }

    initialize() {
        console.log("hello initialize");
    }

    uninitialize() {
        console.log("hello uninitialize");
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
