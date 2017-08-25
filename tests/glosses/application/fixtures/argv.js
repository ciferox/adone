const adone = require("adone").adone;

class TestApp extends adone.application.Application {
    main() {
        adone.log(this.argv.join(" "));
        return 0;
    }
}

adone.application.run(TestApp, true);
