const {
    application,
    promise
} = adone;

class Hello extends application.Subsystem {
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

class TestApp extends application.Application {
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

application.run(TestApp);
