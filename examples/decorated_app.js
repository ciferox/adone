const {
    application: { Application }
} = adone;

const {
    Command,
    MainCommand,
    CommandsGroup,
    Argument,
    Arguments,
    Option,
    Options,
    OptionsGroup
} = Application;

@CommandsGroup({
    name: "math",
    description: "Math"
})
@CommandsGroup({
    name: "log",
    description: "Printers"
})
class MyApp extends Application {
    @MainCommand()
    @Argument("a")
    @Options(["--hello", "--world"])
    main() {
        console.log("hello");
        return 0;
    }

    @Command({
        help: "sum number",
        group: "math"
    })
    @Arguments([{
        name: "a",
        type: Number
    }, {
        name: "b",
        type: Number
    }])
    @OptionsGroup({
        name: "fafa",
        description: "fafa?"
    })
    @Option({
        name: "--negate",
        group: "fafa"
    })
    sum(args, opts) {
        let res = args.get("a") + args.get("b");
        if (opts.get("negate")) {
            res = -res;
        }
        adone.log(res);
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
        help: "div numbers",
        group: "math"
    })
    @Argument("a")
    @Argument("b")
    div(args) {
        adone.log(args.get("a") / args.get("b"));
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

adone.application.run(MyApp);
