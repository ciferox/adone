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

class TestApp extends adone.app.Application {
    async configure() {
        this.addSubsystem({
            subsystem: new AppSubsystem()
        });
    }

    main() {
        return 0;
    }
}

app.run(TestApp);
