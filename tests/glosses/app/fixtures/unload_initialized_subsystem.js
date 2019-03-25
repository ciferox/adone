const {
    app
} = adone;

class Hello extends app.Subsystem {
    onConfigure() {
        console.log("hello configure");
    }

    onInitialize() {
        console.log("hello init");
    }

    onUninitialize() {
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
        await this.unloadSubsystem("hello");
        console.log("has", this.hasSubsystem("hello"));
        return 0;
    }
}

app.run(TestApp);
