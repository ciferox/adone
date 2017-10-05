const adone = require(process.env.ADONE_ROOT_PATH).adone;

const {
    application
} = adone;

class AppSubsystem {
    configure() {
        adone.log("configure");
    }

    initialize() {
        adone.log("initialize");
    }

    uninitialize() {
        adone.log("uninitialize");
    }
}

class TestApp extends adone.application.Application {
    async configure() {
        try {
            await this.addSubsystem({
                subsystem: new AppSubsystem()
            });
        } catch (err) {
            adone.log("incorrect subsystem");
        }
    }

    main() {
        return 0;
    }
}

application.run(TestApp);
