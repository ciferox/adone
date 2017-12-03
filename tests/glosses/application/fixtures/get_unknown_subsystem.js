const {
    application
} = adone;

class AppSubsystem extends application.Subsystem {
}

class TestApp extends adone.application.Application {
    async configure() {
        this.addSubsystem({
            description: "test subsystem",
            subsystem: new AppSubsystem()
        });
    }

    main() {
        const sysInfo = this.getSubsystemInfo("sys");
        adone.log("sdfsdf");
        return 0;
    }
}

application.run(TestApp);
