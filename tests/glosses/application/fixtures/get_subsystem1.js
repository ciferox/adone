const adone = require(process.env.ADONE_ROOT_PATH).adone;

const {
    application
} = adone;

class AppSubsystem extends application.Subsystem {
}

class TestApp extends adone.application.Application {
    async configure() {
        await this.addSubsystem({
            name: "sys1",
            description: "test subsystem",
            subsystem: new AppSubsystem()
        });
    }

    main() {
        const sysInfo = this.getSubsystemInfo("sys1");
        adone.log(sysInfo.description);
        return 0;
    }
}

application.run(TestApp);
