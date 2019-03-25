const {
    app
} = adone;

class AppSubsystem extends app.Subsystem {
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
        this.addSubsystem({
            subsystem: new AppSubsystem()
        });
    }

    run() {
        return 0;
    }
}

app.run(TestApp);
