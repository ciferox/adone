const {
    app,
    promise
} = adone;

class Hello extends app.Subsystem {
    onConfigure() {
        console.log("hello configure");
    }

    onInitialize() {
        console.log("hello init");
    }

    async onUninitialize() {
        await promise.delay(500);
        console.log("hello uninit");
    }
}

class TestApp extends app.Application {
    async onConfigure() {
        this.addSubsystem({
            name: "hello",
            subsystem: new Hello()
        });
    }

    async run() {
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
