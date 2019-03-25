class TestApp extends adone.app.Application {
    run() {
        console.log(this.name);
        return 0;
    }
}

adone.app.run(TestApp);
