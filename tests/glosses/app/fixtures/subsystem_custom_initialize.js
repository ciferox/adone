const {
    app
} = adone;

class AppSubsystem1 extends app.Subsystem {
    onConfigure() {
        console.log("c1");
    }

    onInitialize() {
        console.log("i1");
    }

    onUninitialize() {
        console.log("u1");
    }
}

class AppSubsystem2 extends app.Subsystem {
    onConfigure() {
        console.log("c2");
    }

    onInitialize() {
        console.log("i2");
    }

    onUninitialize() {
        console.log("u2");
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

        console.log("c");
    }

    async onInitialize() {
        await this.initializeSubsystem("AppSubsystem2");

        console.log("i");
    }

    onUninitialize() {
        console.log("u");
    }

    run() {
        return 0;
    }
}

app.run(TestApp);
