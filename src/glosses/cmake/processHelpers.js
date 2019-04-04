const {
    std: { childProcess: { spawn, exec: stdExec } },
    lodash: _
} = adone;

const splitargs = (input, sep, keepQuotes) => {
    const separator = sep || /\s/g;
    let singleQuoteOpen = false;
    let doubleQuoteOpen = false;
    let tokenBuffer = [];
    const ret = [];

    const arr = input.split("");
    for (let i = 0; i < arr.length; ++i) {
        const element = arr[i];
        const matches = element.match(separator);
        if (element === "'" && !doubleQuoteOpen) {
            if (keepQuotes === true) {
                tokenBuffer.push(element);
            }
            singleQuoteOpen = !singleQuoteOpen;
            continue;
        } else if (element === '"' && !singleQuoteOpen) {
            if (keepQuotes === true) {
                tokenBuffer.push(element);
            }
            doubleQuoteOpen = !doubleQuoteOpen;
            continue;
        }

        if (!singleQuoteOpen && !doubleQuoteOpen && matches) {
            if (tokenBuffer.length > 0) {
                ret.push(tokenBuffer.join(""));
                tokenBuffer = [];
            } else if (sep) {
                ret.push(element);
            }
        } else {
            tokenBuffer.push(element);
        }
    }
    if (tokenBuffer.length > 0) {
        ret.push(tokenBuffer.join(""));
    } else if (sep) {
        ret.push("");
    }
    return ret;
};

export const run = (command, options) => {
    options = _.defaults(options, { silent: false });
    return new Promise((resolve, reject) => {
        const args = splitargs(command);
        const name = args[0];
        args.splice(0, 1);
        const child = spawn(name, args, { stdio: options.silent ? "ignore" : "inherit" });
        let ended = false;
        child.on("error", (e) => {
            if (!ended) {
                reject(e);
                ended = true;
            }
        });
        child.on("exit", (code, signal) => {
            if (!ended) {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Process terminated: ${code}` || signal));
                }
                ended = true;
            }
        });
    });
};

export const exec = (command) => {
    return new Promise((resolve, reject) => {
        stdExec(command, (err, stdout, stderr) => {
            if (err) {
                reject(new Error(`${err.message}\n${stdout || stderr}`));
            } else {
                resolve(stdout);
            }
        });
    });
};
