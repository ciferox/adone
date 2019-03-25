const {
    app
} = adone;

class AppSubsystem extends app.Subsystem {
    onConfigure() {
        console.log("configure");
    }

    onInitialize() {
        console.log("initialize");
    }

    onUninitialize() {
        console.log("uninitialize");
    }
}

class TestApp extends adone.app.Application {
    async onConfigure() {
        this.addSubsystem({
            name: "hello",
            subsystem: new AppSubsystem()
        });
    }

    async run() {
        console.log("main");
        await this.uninitializeSubsystem("hello");
        await this.deleteSubsystem("hello");
        console.log(this.hasSubsystem("hello"));
        return 0;
    }
}

app.run(TestApp);
