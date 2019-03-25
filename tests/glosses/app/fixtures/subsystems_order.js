const {
    app
} = adone;

class AppSubsystem1 extends app.Subsystem {
    onConfigure() {
        console.log("configure1");
    }

    onInitialize() {
        console.log("initialize1");
    }

    onUninitialize() {
        console.log("uninitialize1");
    }
}

class AppSubsystem2 extends app.Subsystem {
    onConfigure() {
        console.log("configure2");
    }

    onInitialize() {
        console.log("initialize2");
    }

    onUninitialize() {
        console.log("uninitialize2");
    }
}

class TestApp extends adone.app.Application {
    async onConfigure() {
        this.addSubsystem({
            subsystem: new AppSubsystem1()
        });

        this.addSubsystem({
            subsystem: new AppSubsystem2()
        });

        console.log("app_configure");
    }

    onInitialize() {
        console.log("app_initialize");
    }

    onUninitialize() {
        console.log("app_uninitialize");
    }

    run() {
        return 0;
    }
}

app.run(TestApp);
