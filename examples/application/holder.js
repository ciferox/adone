const {
    app
} = adone;

const {
    DMainCliCommand
} = app;

class MyApp extends app.CliApplication {
    @DMainCliCommand({
        arguments: [{
            name: "a",
            holder: "A_VAR" // this name will be used in usage/help messages
        }, {
            name: "b",
            nargs: 2,
            holder: ["B0", "B1"] // if an argument has a finite number of arguments and the number > 1
        }, {
            name: "c" // by default it equals to the name
        }],
        options: [{
            name: "--opt",
            nargs: 1,
            holder: "KEY" // this name will be used as option's variable name in usage/help messages
        }, {
            name: "--opt2",
            nargs: 2,
            holder: ["A", "B"] // if an option has a finite number of arguments and the number > 1
        }]
    })
    main() {}
}

app.runCli(MyApp);
