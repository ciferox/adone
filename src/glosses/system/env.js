const {
    is,
    std
} = adone;
const { os } = std;

adone.asNamespace(exports);

export const user = () => {
    let result = is.windows ? `${process.env.USERDOMAIN}\\${process.env.USERNAME}` : process.env.USER;
    if (is.undefined(result)) {
        result = adone.system.user.username(); // fallback
    }
    return result;
};
export const prompt = () => is.windows ? process.env.PROMPT : process.env.PS1;
export const hostname = () => os.hostname();
export const tmpdir = () => os.tmpdir();
export const home = () => os.homedir();

export const pathKey = () => is.windows
    ? Object.keys(process.env).find((key) => key.toUpperCase() === "PATH") || "Path"
    : "PATH";

export const path = ({ cwd = process.cwd(), path: customPath } = {}) => {
    customPath = customPath || process.env[pathKey()].split(std.path.delimiter);
    let previous;
    let cwdPath = std.path.resolve(cwd);
    const result = [];

    while (previous !== cwdPath) {
        result.push(std.path.join(cwdPath, "node_modules/.bin"));
        previous = cwdPath;
        cwdPath = std.path.resolve(cwdPath, "..");
    }

    // Ensure the running `node` binary is used
    result.push(std.path.dirname(process.execPath));

    return [...result, ...customPath];
};

export const editor = () => process.env.EDITOR || process.env.VISUAL || (is.windows ? "notepad.exe" : "vi");
export const shell = () => is.windows ? process.env.ComSpec || "cmd" : process.env.SHELL || "bash";


export const all = (options = {}) => {
    const env = options.env || process.env;
    env[pathKey()] = path(options).join(std.path.delimiter);
    return env;
};
