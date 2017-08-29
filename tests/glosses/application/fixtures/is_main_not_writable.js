const adone = require(process.env.ADONE_ROOT_PATH).adone;

class TestApp extends adone.application.Application {
    main() {
        try {
            this.isMain = false;
            adone.log("bad");
        } catch (err) {
            adone.log("ok");
        }
        return 0;
    }
}

adone.application.run(TestApp);
