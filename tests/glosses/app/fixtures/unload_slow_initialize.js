const {
    app,
    promise
} = adone;

class Hello extends app.Subsystem {
    configure() {
        adone.log("hello configure");
    }

    async initialize() {
        await promise.delay(500);
        adone.log("hello init");
    }

    uninitialize() {
        adone.log("hello uninit");
    }
}

class TestApp extends app.Application {
    async main() {
        adone.log("main");
        await Promise.all([
            this.loadSubsystem(new Hello(), { name: "hello" }),
            adone.promise.delay(100).then(() => this.unloadSubsystem("hello"))
        ]);
        adone.log("has", this.hasSubsystem("hello"));
        return 0;
    }
}

app.run(TestApp);
