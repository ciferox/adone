const commands = {
    Base: "./commands/base"
};

[
    "cat",
    "cd",
    // "chmod",
    // "cp",
    // "dirs",
    "echo",
    // "exec",
    // "find",
    // "grep",
    // "head",
    // "ln",
    // "ls",
    // "mkdir",
    // "mv",
    "pwd",
    // "rm",
    // "sed",
    // "set",
    // "sort",
    // "tail",
    // "tempdir",
    // "test",
    // "to",
    // "toEnd",
    // "touch",
    // "uniq",
    "which",
    "whoami"
].forEach((command) => {
    commands[command] = [`./commands/${command}`, (mod) => (...args) => (new mod.Command()).execute(...args)];
});

adone.lazify(commands, exports, require);
