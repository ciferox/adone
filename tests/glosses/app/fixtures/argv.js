class TestApp extends adone.app.CliApplication {
    main() {
        console.log(this.argv.join(" "));
        return 0;
    }
}

adone.app.runCli(TestApp, true);
