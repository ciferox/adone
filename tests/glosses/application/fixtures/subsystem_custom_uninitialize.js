const adone = require(process.env.ADONE_ROOT_PATH).adone;

const {
    application
} = adone;

class AppSubsystem1 extends application.Subsystem {
    configure() {
        adone.log("configure1");
    }

    initialize() {
        adone.log("initialize1");
    }

    uninitialize() {
        adone.log("uninitialize1");
    }
}

class AppSubsystem2 extends application.Subsystem {
    configure() {
        adone.log("configure2");
    }

    initialize() {
        adone.log("initialize2");
    }

    uninitialize() {
        adone.log("uninitialize2");
    }
}

class TestApp extends adone.application.Application {
    async configure() {
        await this.addSubsystem({
            subsystem: new AppSubsystem1()
        });

        await this.addSubsystem({
            subsystem: new AppSubsystem2()
        });

        adone.log("app_configure");
    }

    async initialize() {
        adone.log("app_initialize");
    }

    async uninitialize() {
        await this.uninitializeSubsystem("AppSubsystem1");

        adone.log("app_uninitialize");
    }

    main() {
        return 0;
    }
}

application.run(TestApp);