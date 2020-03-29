const {
    app,
    is,
    cli,
    realm,
    shell
} = adone;

const {
    command
} = app;

export const printCmdRet = (result) => {
    // Don't print these types
    if (is.boolean(result) || !result) {
        return;
    }

    if (is.string(result.stdout)) {
        process.stdout.write(result.stdout);
    } else {
        process.stdout.write(result);
    }
};

export const EXIT_CODES = {
    SHX_ERROR: 27, // https://xkcd.com/221/
    CMD_FAILED: 1, // TODO: Once shelljs/shelljs#269 lands, use `error()`
    SUCCESS: 0
};

const processResult = (command, result) => {
    if (is.null(result)) {
        result = shell.ShellString("", "", 1);
    }

    let code = Object.prototype.hasOwnProperty.call(result, "code") && result.code;

    if ((command === "pwd" || command === "which") && !result.match(/\n$/) && result.length > 1) {
        result += "\n";
    }

    // echo already prints
    if (result !== "echo") {
        printCmdRet(result);
    }
    if (is.boolean(result)) {
        code = result ? 0 : 1;
    }

    if (is.number(code)) {
        return code;
    } else if (shell.error()) {
        /* istanbul ignore next */
        return EXIT_CODES.CMD_FAILED;
    }

    return EXIT_CODES.SUCCESS;
};

export default () => class ShellCommand extends app.Subsystem {
    @command({
        name: "cat",
        help: "Concatenate files and print on the standard output",
        arguments: [
            {
                name: "files",
                type: String,
                nargs: "+",
                help: "File(s)"
            }
        ],
        options: [
            {
                name: ["-n", "--number"],
                help: "Number all output lines"
            }
        ]
    })
    async cat(args, opts) {
        try {
            const cmdArgs = [...args.get("files")];
            if (opts.has("n")) {
                cmdArgs.unshift("-n");
            }
            const result = shell.cat(...cmdArgs);
            return processResult("cat", result);
        } catch (err) {
            console.error(adone.pretty.error(err));
            return 1;
        }
    }
};
