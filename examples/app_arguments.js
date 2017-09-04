adone.application.run({
    initialize() {
        this.defineArguments({
            arguments: [
                { name: "number", default: 4 },
                { name: "boolean-true", default: true },
                { name: "boolean-false", default: false },
                { name: "null", default: null },
                { name: "undefined", default: undefined, colors: {
                    argumentName: (x) => adone.runtime.term.red(x)
                } },
                { name: "choices", choices: [1, 2, 3, "hello", false], default: 2, help: "must be one of" }
            ],
            options: [
                { name: "--array", nargs: 1, default: ["", "1", 2], help: "some text", colors: {
                    optionName: (x) => adone.runtime.term.grey(x)
                } },
                { name: "--nested-array", holder: "AA", nargs: 1, default: [[1], [false], [[{ a: 2 }]]], colors: false },
                { name: "--object", nargs: 1, default: { a: 1, b: "123", c: [{ b: 4, c: "2" }] }, colors: {
                    value: { number: (x) => adone.runtime.term.red(x) }
                } },
                { name: "--object-2", nargs: 1, default: { a: 1, b: "123", c: [{ b: 4, c: "2" }] }, colors: {
                    inherit: false,
                    value: { number: (x) => adone.runtime.term.green(x) }
                } },
                { name: "--object-3", nargs: 1, default: { a: 1, b: "123", c: [{ b: 4, c: "2" }] }, colors: "default" }
            ],
            commands: [
                { name: "command-1", help: "this is command 1" },
                { name: "command-2", help: "{magenta-bg}Help message styling{/}" },
                { name: "command-3" },
                { name: "command-4", help: "this is command 4" },
                {
                    name: "command-5",  // uses parent colors
                    colors: {
                        commandName: (x) => adone.runtime.term.yellow(x)  // only for inner commands
                    },
                    commands: [
                        { name: "command-1" },
                        { name: "command-2" },
                        { name: "command-3" },
                        { name: "command-4" }
                    ]
                },
                {
                    name: "command-6",
                    help: "uses default colors",
                    arguments: ["a1", "a2", "a3"],
                    options: ["--o1", "--o2", { name: "--o3", nargs: 1, holder: "X" }],
                    commands: [
                        { name: "command-1" },
                        { name: "command-2" },
                        { name: "command-3" }
                    ]
                },
                {
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
                },
                {
                    name: "command-8",
                    help: "extends default colors",
                    colors: {
                        optionName: (x) => adone.runtime.term.grey(x)
                    },
                    arguments: ["a1", "a2", "a3"],
                    options: ["--o1", "--o2", { name: "--o3", nargs: 1, holder: "X" }],
                    commands: [
                        { name: "command-1" },
                        { name: "command-2" },
                        { name: "command-3" }
                    ]
                },
                {
                    name: "command-9",
                    help: "extends parent colors",
                    colors: {
                        inherit: true,
                        optionName: (x) => adone.runtime.term.grey(x)
                    },
                    arguments: ["a1", "a2", "a3"],
                    options: ["--o1", "--o2", { name: "--o3", nargs: 1, default: "test", holder: "X", colors: {
                        optionName: (x) => adone.runtime.term.yellow(x),
                        value: { string: (x) => adone.runtime.term.red(x) }
                    } }],
                    commands: [
                        { name: "command-1" },
                        { name: "command-2" },
                        { name: "command-3" }
                    ]
                },
                {
                    name: "command-10",
                    help: "no colors",
                    colors: false,
                    arguments: ["a1", "a2", "a3"],
                    options: ["--o1", "--o2", { name: "--o3", nargs: 1, default: "test", holder: "X", colors: {
                        optionName: (x) => adone.runtime.term.yellow(x),
                        value: { string: (x) => adone.runtime.term.red(x) }
                    } }],
                    commands: [
                        { name: "command-1", help: "default colors" },
                        { name: "command-2", colors: "inherit", help: "no colors from parent" },
                        { name: "command-3", colors: false, help: "no colors from itself" }
                    ]
                }
            ],
            colors: {
                usage: (x) => adone.runtime.term.strikethrough.grey(x),
                commandName: (x) => {
                    switch (Number(x[x.length - 1]) % 3) {
                        case 0: {
                            return adone.runtime.term.red(x);
                        }
                        case 1: {
                            return adone.runtime.term.green(x);
                        }
                        case 2: {
                            return adone.runtime.term.cyan(x);
                        }
                    }
                },
                optionName: (x) => {
                    if (Math.random() > 0.5) {
                        return adone.runtime.term.cyan(x);
                    }
                    return adone.runtime.term.red(x);
                }
            }
        });
    },
    main() {
        adone.log("it works");
    }
});
