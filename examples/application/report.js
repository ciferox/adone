const {
    app
} = adone;

const {
    DCliCommand
} = app;

class App extends app.Application {
    configure() {
        this.enableReport({
            directory: adone.std.os.tmpdir()
        });
    }

    @DCliCommand()
    error() {
        setTimeout(() => {
            throw new Error("hello");
        }, 500);
    }

    @DCliCommand()
    loop() {
        console.log(`kill -12 ${process.pid}`);
        for ( ; ; ) {
            // ha
        }
    }
}

app.run(App, {
    useArgs: true
});
