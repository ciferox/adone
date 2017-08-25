const adone = require("adone").adone;

class TestApp extends adone.application.Application {
    main() {
        return 7;
    }
}

adone.application.run(TestApp);
