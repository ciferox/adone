const {
    application
} = adone;

class App extends application.Application {
    main() {
        adone.log("app running");
    }
}

application.run(App);
