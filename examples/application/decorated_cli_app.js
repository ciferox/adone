const {
    application: { CliApplication }
} = adone;

const {
    Command,
    MainCommand,
    CommandsGroup
} = CliApplication;

@CommandsGroup({
    name: "math",
    description: "Math"
})
@CommandsGroup({
    name: "log",
    description: "Printers"
})
class MyApp extends CliApplication {
    @MainCommand()
    main() {
        console.log("hello");
        return 0;
    }

    @Command({
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
        adone.log(args.get("a") * args.get("b"));
        return 0;
    }

    @Command({
        arguments: ["a"],
        help: "print the argument",
        group: "log"
    })
    log(args) {
        adone.log(args.get("a"));
        return 0;
    }
}

adone.application.runCli(MyApp);
