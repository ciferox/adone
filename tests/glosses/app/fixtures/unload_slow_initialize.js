const {
    app,
    promise
} = adone;

class Hello extends app.Subsystem {
    configure() {
        console.log("hello configure");
    }

    async initialize() {
        await promise.delay(500);
        console.log("hello init");
    }

    uninitialize() {
        console.log("hello uninit");
    }
}

class TestApp extends app.Application {
    async main() {
        console.log("main");
        await Promise.all([
            this.loadSubsystem(new Hello(), { name: "hello" }),
            adone.promise.delay(100).then(() => this.unloadSubsystem("hello"))
        ]);
        console.log("has", this.hasSubsystem("hello"));
        return 0;
    }
}

app.run(TestApp);
