const {
    is,
    std: { os }
} = adone;

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
export const path = () => (process.env.PATH || process.env.Path || process.env.path).split(is.windows ? ";" : ":");
export const editor = () => process.env.EDITOR || process.env.VISUAL || (is.windows ? "notepad.exe" : "vi");
export const shell = () => is.windows ? process.env.ComSpec || "cmd" : process.env.SHELL || "bash";
