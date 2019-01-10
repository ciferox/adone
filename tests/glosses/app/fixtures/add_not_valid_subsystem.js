const {
    app
} = adone;

class AppSubsystem {
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
        try {
            this.addSubsystem({
                subsystem: new AppSubsystem()
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
