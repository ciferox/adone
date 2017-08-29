const adone = require(process.env.ADONE_ROOT_PATH).adone;

class TestApp extends adone.application.Application {
    main() {
        adone.log(this.name);
        return 0;
    }
}

adone.application.run(TestApp);
