const {
    app,
    promise
} = adone;

class Hello extends app.Subsystem {
    configure() {
        adone.log("hello configure");
    }

    initialize() {
        adone.log("hello init");
    }

    async uninitialize() {
        await promise.delay(500);
        adone.log("hello uninit");
    }
}

class TestApp extends app.Application {
    async configure() {
        this.addSubsystem({
            name: "hello",
            subsystem: new Hello()
        });
    }

    async main() {
        adone.log("main");
        await Promise.all([
            this.uninitializeSubsystem("hello"),
            adone.promise.delay(100).then(() => this.unloadSubsystem("hello"))
        ]);
        adone.log("has", this.hasSubsystem("hello"));
        return 0;
    }
}

app.run(TestApp);