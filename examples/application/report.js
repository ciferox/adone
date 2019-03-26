const {
    app
} = adone;

const {
    command
} = app;

class App extends app.Application {
    configure() {
        app.configureReport({
            directory: adone.std.os.tmpdir()
        });
    }

    @command()
    error() {
        setTimeout(() => {
            throw new Error("hello");
        }, 500);
    }

    @command()
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
