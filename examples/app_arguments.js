adone.run({
    initialize() {
        this.defineArguments({
            arguments: [
                { name: "number", default: 4 },
                { name: "boolean-true", default: true },
                { name: "boolean-false", default: false },
                { name: "null", default: null },
                { name: "undefined", default: undefined, colors: {
                    argumentName: (x) => adone.terminal.red(x)
                } },
                { name: "choices", choices: [1, 2, 3, "hello", false], default: 2, help: "must be one of" }
            ],
            options: [
                { name: "--array", nargs: 1, default: ["", "1", 2], help: "some text", colors: {
                    optionName: (x) => adone.terminal.white(x)
                } },
                { name: "--nested-array", holder: "AA", nargs: 1, default: [[1], [false], [[{ a: 2 }]]] },
                { name: "--object", nargs: 1, default: { a: 1, b: "123", c: [{ b: 4, c: "2" }] }, colors: {
                    value: { number: (x) => adone.terminal.red(x) }
                } }
            ],
            commands: [
                { name: "command-1", help: "this is command 1" },
                { name: "command-2", help: "{magenta-bg}Help message styling{/}" },
                { name: "command-3" },
                { name: "command-4", help: "this is command 4" },
                {
                    name: "command-5",  // uses parent colors
                    colors: {
                        commandName: (x) => adone.terminal.yellow(x)  // only for inner commands
                    },
                    commands: [
                        { name: "command-5-1" },
                        { name: "command-5-2" },
                        { name: "command-5-3" },
                        { name: "command-5-4" }
                    ]
                }
            ],
            colors: {
                usage: (x) => adone.terminal.strikethrough.grey(x),
                commandName: (x) => {
                    switch (Number(x[x.length - 1]) % 3) {
                        case 0: {
                            return adone.terminal.red(x);
                        }
                        case 1: {
                            return adone.terminal.green(x);
                        }
                        case 2: {
                            return adone.terminal.cyan(x);
                        }
                    }
                }
            }
        });
    },
    main() {
        adone.log("it works");
    }
});
