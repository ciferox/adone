const {
    app
} = adone;

class AppSubsystem1 extends app.Subsystem {
    configure() {
        console.log("c1");
    }

    initialize() {
        console.log("i1");
    }

    uninitialize() {
        console.log("u1");
    }
}

class AppSubsystem2 extends app.Subsystem {
    configure() {
        console.log("c2");
    }

    initialize() {
        console.log("i2");
    }

    uninitialize() {
        console.log("u2");
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

        console.log("c");
    }

    async initialize() {
        console.log("i");
    }

    async uninitialize() {
        await this.uninitializeSubsystem("AppSubsystem1");

        console.log("u");
    }

    main() {
        return 0;
    }
}

app.run(TestApp);
