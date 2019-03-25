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

class Hello extends app.Subsystem {
    onConfigure() {
        console.log("hello configure");
    }

    onInitialize() {
        console.log("hello initialize");
    }

    onUninitialize() {
        console.log("hello uninitialize");
    }
}

class TestApp extends adone.app.Application {
    async onConfigure() {
        this.addSubsystem({
            subsystem: new AppSubsystem(),
            name: "Hello"
        });
        this.addSubsystem({
            subsystem: new Hello()
        });
    }

    run() {
        return 0;
    }
}

app.run(TestApp);
