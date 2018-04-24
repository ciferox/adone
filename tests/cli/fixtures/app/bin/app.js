const {
    app
} = adone;

class App extends app.Application {
    main() {
        adone.log("app running");
    }
}

app.run(App);
