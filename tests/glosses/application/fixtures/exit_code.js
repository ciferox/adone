const adone = require(process.env.ADONE_ROOT_PATH).adone;

class TestApp extends adone.application.Application {
    main() {
        return 7;
    }
}

adone.application.run(TestApp);
