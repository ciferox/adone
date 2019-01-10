const {
    app
} = adone;

class AppSubsystem1 extends app.Subsystem {
    configure() {
        console.log("configure1");
    }

    initialize() {
        console.log("initialize1");
    }

    uninitialize() {
        console.log("uninitialize1");
    }
}

class AppSubsystem2 extends app.Subsystem {
    configure() {
        console.log("configure2");
    }

    initialize() {
        console.log("initialize2");
    }

    uninitialize() {
        console.log("uninitialize2");
    }
}

class TestApp extends adone.app.Application {
    async configure() {
        this.addSubsystem({
            subsystem: new AppSubsystem1()
        });

        this.addSubsystem({
            subsystem: new AppSubsystem2()
        });

        console.log("app_configure");
    }

    initialize() {
        console.log("app_initialize");
    }

    uninitialize() {
        console.log("app_uninitialize");
    }

    main() {
        return 0;
    }
}

app.run(TestApp);
