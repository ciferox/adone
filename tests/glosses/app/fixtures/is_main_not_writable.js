class TestApp extends adone.app.Application {
    run() {
        try {
            this.isMain = false;
            console.log("bad");
        } catch (err) {
            console.log("ok");
        }
        return 0;
    }
}

adone.app.run(TestApp);
