const adone = require("adone").adone;

class TestApp {
    main() {
        adone.log(this.name);
        return 0;
    }
}

adone.application.run(TestApp);
