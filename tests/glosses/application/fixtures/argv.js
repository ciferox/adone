class TestApp extends adone.app.CliApplication {
    main() {
        adone.log(this.argv.join(" "));
        return 0;
    }
}

adone.app.runCli(TestApp, true);
