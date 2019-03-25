const {
    app
} = adone;

class AppSubsystem {
    onConfigure() {
        console.log("configure");
    }

    onInitialize() {
        console.log("initialize");
    }

    onUninitialize() {
        console.log("uninitialize");
    }
}

class TestApp extends adone.app.Application {
    async onConfigure() {
        try {
            this.addSubsystem({
                subsystem: new AppSubsystem()
            });
        } catch (err) {
            console.log("incorrect subsystem");
        }
    }

    run() {
        return 0;
    }
}

app.run(TestApp);
