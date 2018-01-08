const {
    application
} = adone;

const {
    DCliCommand
} = application;

class App extends application.CliApplication {
    configure() {
        this.enableReport({
            directory: adone.std.os.tmpdir()
        });
    }

    @DCliCommand()
    exception() {
        setTimeout(() => {
            throw new Error("hello");
        }, 500);
    }

    @DCliCommand()
    loop() {
        adone.log(`kill -12 ${process.pid}`);
        for ( ; ; ) {
            // ha
        }
    }
}

application.runCli(App);
