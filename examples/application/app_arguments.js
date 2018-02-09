const {
    application
} = adone;

const {
    DMainCliCommand,
    DCliCommand
} = application;

class App extends application.CliApplication {
    @DMainCliCommand({
        arguments: [
            { name: "number", default: 4 },
            { name: "boolean-true", default: true },
            { name: "boolean-false", default: false },
            { name: "null", default: null },
            { name: "undefined", default: undefined, colors: {
                argumentName: (x) => adone.terminal.chalk.red(x)
            } },
            { name: "choices", choices: [1, 2, 3, "hello", false], default: 2, help: "must be one of" }
        ],
        options: [
            { name: "--array", nargs: 1, default: ["", "1", 2], help: "some text", colors: {
                optionName: (x) => adone.terminal.chalk.grey(x)
            } },
            { name: "--nested-array", holder: "AA", nargs: 1, default: [[1], [false], [[{ a: 2 }]]], colors: false },
            { name: "--object", nargs: 1, default: { a: 1, b: "123", c: [{ b: 4, c: "2" }] }, colors: {
                value: { number: (x) => adone.terminal.chalk.red(x) }
            } },
            { name: "--object-2", nargs: 1, default: { a: 1, b: "123", c: [{ b: 4, c: "2" }] }, colors: {
                inherit: false,
                value: { number: (x) => adone.terminal.chalk.green(x) }
            } },
            { name: "--object-3", nargs: 1, default: { a: 1, b: "123", c: [{ b: 4, c: "2" }] }, colors: "default" }
        ],
        colors: {
            usage: (x) => adone.terminal.chalk.strikethrough.grey(x),
            commandName: (x) => {
                switch (Number(x[x.length - 1]) % 3) {
                    case 0: {
                        return adone.terminal.chalk.red(x);
                    }
                    case 1: {
                        return adone.terminal.chalk.green(x);
                    }
                    case 2: {
                        return adone.terminal.chalk.cyan(x);
                    }
                }
            },
            optionName: (x) => {
                if (Math.random() > 0.5) {
                    return adone.terminal.chalk.cyan(x);
                }
                return adone.terminal.chalk.red(x);
            }
        }
    })
    main() {}

    @DCliCommand({
        name: "command-1",
        help: "this is command 1"
    })
    cmd1() {}

    @DCliCommand({
        name: "command-2",
        help: "{magenta-bg}Help message styling{/}",
        colors: {
            commandHelpMessage: (x) => adone.terminal.chalk.italic(adone.runtime.term.parse(x))
        }
    })
    cmd2() {}

    @DCliCommand({
        name: "command-3"
    })
    cmd3() {}

    @DCliCommand({
        name: "command-4",
        help: "this is command 4"
    })
    cmd4() {}

    @DCliCommand({
        name: "command-5", // uses parent colors
        colors: {
            commandName: (x) => adone.terminal.chalk.yellow(x) // only for inner commands
        },
        commands: [
            { name: "command-1" },
            { name: "command-2" },
            { name: "command-3" },
            { name: "command-4" }
        ]
    })
    cmd5() {}

    @DCliCommand({
        name: "command-6",
        help: "uses default colors",
        arguments: ["a1", "a2", "a3"],
        options: ["--o1", "--o2", { name: "--o3", nargs: 1, holder: "X" }],
        commands: [
            { name: "command-1" },
            { name: "command-2" },
            { name: "command-3" }
        ]
    })
    cmd6() {}

    @DCliCommand({
        name: "command-7",
        help: "inherit parent colors",
        colors: "inherit",
        arguments: ["a1", "a2", "a3"],
        options: ["--o1", "--o2", { name: "--o3", nargs: 1, holder: "X" }],
        commands: [
            { name: "command-1" },
            { name: "command-2" },
            { name: "command-3" }
        ]
    })
    cmd7() {}

    @DCliCommand({
        name: "command-8",
        help: "extends default colors",
        colors: {
            optionName: (x) => adone.terminal.chalk.grey(x)
        },
        arguments: ["a1", "a2", "a3"],
        options: ["--o1", "--o2", { name: "--o3", nargs: 1, holder: "X" }],
        commands: [
            { name: "command-1" },
            { name: "command-2" },
            { name: "command-3" }
        ]
    })
    cmd8() {}

    @DCliCommand({
        name: "command-9",
        help: "extends parent colors",
        colors: {
            inherit: true,
            optionName: (x) => adone.terminal.chalk.grey(x)
        },
        arguments: ["a1", "a2", "a3"],
        options: ["--o1", "--o2", { name: "--o3", nargs: 1, default: "test", holder: "X", colors: {
            optionName: (x) => adone.terminal.chalk.yellow(x),
            value: { string: (x) => adone.terminal.chalk.red(x) }
        } }],
        commands: [
            { name: "command-1" },
            { name: "command-2" },
            { name: "command-3" }
        ]
    })
    cmd9() {}

    @DCliCommand({
        name: "command-10",
        help: "no colors",
        colors: false,
        arguments: ["a1", "a2", "a3"],
        options: ["--o1", "--o2", { name: "--o3", nargs: 1, default: "test", holder: "X", colors: {
            optionName: (x) => adone.terminal.chalk.yellow(x),
            value: { string: (x) => adone.terminal.chalk.red(x) }
        } }],
        commands: [
            { name: "command-1", help: "default colors" },
            { name: "command-2", colors: "inherit", help: "no colors from parent" },
            { name: "command-3", colors: false, help: "no colors from itself" }
        ]
    })
    cmd10() {}
}

application.runCli(App);
