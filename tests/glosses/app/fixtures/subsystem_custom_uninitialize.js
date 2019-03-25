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
        console.log("i");
    }

    async onUninitialize() {
        await this.uninitializeSubsystem("AppSubsystem1");

        console.log("u");
    }

    run() {
        return 0;
    }
}

app.run(TestApp);
