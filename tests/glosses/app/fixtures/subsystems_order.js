const {
    app
} = adone;

class AppSubsystem1 extends app.Subsystem {
    configure() {
        adone.log("configure1");
    }

    initialize() {
        adone.log("initialize1");
    }

    uninitialize() {
        adone.log("uninitialize1");
    }
}

class AppSubsystem2 extends app.Subsystem {
    configure() {
        adone.log("configure2");
    }

    initialize() {
        adone.log("initialize2");
    }

    uninitialize() {
        adone.log("uninitialize2");
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

        adone.log("app_configure");
    }

    initialize() {
        adone.log("app_initialize");
    }

    uninitialize() {
        adone.log("app_uninitialize");
    }

    main() {
        return 0;
    }
}

app.run(TestApp);