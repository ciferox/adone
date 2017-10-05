const adone = require(process.env.ADONE_ROOT_PATH).adone;

const {
    application,
    std
} = adone;

class TestApp extends adone.application.Application {
    async configure() {
        try {
            await this.addSubsystem({
                subsystem: std.path.join(__dirname, "not_valid_subsystem.js")
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
