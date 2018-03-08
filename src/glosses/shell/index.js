export const common = require("./common");

const commands = [
    "cat",
    "cd",
    "chmod",
    "cp",
    "dirs",
    "echo",
    "exec",
    "find",
    "grep",
    "head",
    "ln",
    "ls",
    "mkdir",
    "mv",
    "pwd",
    "rm",
    "sed",
    "set",
    "sort",
    "tail",
    "tempdir",
    "test",
    "to",
    "toEnd",
    "touch",
    "uniq",
    "which"
];

// Load all default commands
commands.forEach((command) => {
    require(`./commands/${command}`);
});

export const error = require("./error");
export const ShellString = common.ShellString;
export const config = common.config;
