const {
    app
} = adone;

class AppSubsystem extends app.Subsystem {
}

class TestApp extends adone.app.Application {
    async onConfigure() {
        this.addSubsystem({
            description: "test subsystem",
            subsystem: new AppSubsystem()
        });
    }

    run() {
        const sysInfo = this.getSubsystemInfo("AppSubsystem");
        console.log(sysInfo.description);
        return 0;
    }
}

app.run(TestApp);
