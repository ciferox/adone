const shell = require("shelljs");

adone.lazify({
    plugin: "shelljs/plugin"
}, adone.asNamespace(shell), require);

export default shell;
