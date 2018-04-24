const {
    app
} = adone;

class AppSubsystem1 extends app.Subsystem {
    configure() {
        adone.log("c1");
    }

    initialize() {
        adone.log("i1");
    }

    uninitialize() {
        adone.log("u1");
    }
}

class AppSubsystem2 extends app.Subsystem {
    configure() {
        adone.log("c2");
    }

    initialize() {
        adone.log("i2");
    }

    uninitialize() {
        adone.log("u2");
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

        adone.log("c");
    }

    async initialize() {
        adone.log("i");
    }

    async uninitialize() {
        await this.uninitializeSubsystem("AppSubsystem1");

        adone.log("u");
    }

    main() {
        return 0;
    }
}

app.run(TestApp);
