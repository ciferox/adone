const adone = require(process.env.ADONE_ROOT_PATH).adone;

class TestApp {
    main() {
        adone.log(this.name);
        return 0;
    }
}

adone.application.run(TestApp);
