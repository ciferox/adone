const {
    app
} = adone;

const opts = {
    a: 1,
    b: "opt",
    c: {
        d: new Date()
    }
};

class App extends app.Application {
    initialize(options) {
        console.log(adone.is.deepEqual(options, opts));
    }
}

app.run(App, {
    useArgs: process.env.WITH_ARGS === "yes",
    version: "1.0.0",
    ...opts
});
