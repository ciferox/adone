const {
    app
} = adone;

const {
    DCliCommand,
    DMainCliCommand,
    DApplication
} = app;

@DApplication({
    commandsGroups: [
        {
            name: "math",
            description: "Math"
        }, {
            name: "log",
            description: "Printers"
        }
    ]
})
class MyApp extends app.Application {
    @DMainCliCommand()
    main() {
        console.log("hello");
        return 0;
    }

    @DCliCommand({
        name: "mul",
        arguments: [{
            name: "a",
            type: Number
        }, {
            name: "b",
            type: Number
        }],
        help: "mul numbers",
        group: "math"
    })
    mul(args) {
        console.log(args.get("a") * args.get("b"));
        return 0;
    }

    @DCliCommand({
        name: "log",
        arguments: ["a"],
        help: "print the argument",
        group: "log"
    })
    log(args) {
        console.log(args.get("a"));
        return 0;
    }
}

app.run(MyApp, {
    useArgs: true
});
