const adone = require(process.env.ADONE_ROOT_PATH).adone;

const {
    application
} = adone;

class AppSubsystem extends application.Subsystem {
}

class TestApp extends adone.application.Application {
    async initialize() {
        await this.addSubsystem({
            subsystem: new AppSubsystem()
        });
    }

    main() {
        return 0;
    }
}

application.run(TestApp);
