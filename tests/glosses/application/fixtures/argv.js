const adone = require(process.env.ADONE_ROOT_PATH).adone;

class TestApp extends adone.application.CliApplication {
    main() {
        adone.log(this.argv.join(" "));
        return 0;
    }
}

adone.application.runCli(TestApp, true);
