const adone = require(process.env.ADONE_ROOT_PATH).adone;

const {
    application
} = adone;

class AppSubsystem extends application.Subsystem {
}

class TestApp extends adone.application.Application {
    async configure() {
        await this.addSubsystem({
            description: "test subsystem",
            subsystem: new AppSubsystem()
        });
    }

    main() {
        const sysInfo = this.getSubsystemInfo("AppSubsystem");
        adone.log(sysInfo.description);
        return 0;
    }
}

application.run(TestApp);
