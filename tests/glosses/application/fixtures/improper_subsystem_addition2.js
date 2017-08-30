const adone = require(process.env.ADONE_ROOT_PATH).adone;

const {
    application
} = adone;

class AppSubsystem extends application.Subsystem {
}

class TestApp extends adone.application.Application {
    async main() {
        await this.addSubsystem({
            subsystem: new AppSubsystem()
        });
        return 0;
    }
}

application.run(TestApp);
