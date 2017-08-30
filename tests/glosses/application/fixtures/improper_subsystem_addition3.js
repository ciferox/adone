const adone = require(process.env.ADONE_ROOT_PATH).adone;

const {
    application
} = adone;

class AppSubsystem extends application.Subsystem {
}

class TestApp extends adone.application.Application {
    main() {
        return 0;
    }
    async uninitialize() {
        await this.addSubsystem({
            subsystem: new AppSubsystem()
        });
    }
}

application.run(TestApp);
