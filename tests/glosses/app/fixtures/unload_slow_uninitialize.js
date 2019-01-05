const {
    app,
    promise
} = adone;

class Hello extends app.Subsystem {
    configure() {
        console.log("hello configure");
    }

    initialize() {
        console.log("hello init");
    }

    async uninitialize() {
        await promise.delay(500);
        console.log("hello uninit");
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
        console.log("main");
        await Promise.all([
            this.uninitializeSubsystem("hello"),
            adone.promise.delay(100).then(() => this.unloadSubsystem("hello"))
        ]);
        console.log("has", this.hasSubsystem("hello"));
        return 0;
    }
}

app.run(TestApp);
