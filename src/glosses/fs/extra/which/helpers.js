
const {
    is,
    path: { delimiter, join }
} = adone;

const isWindows = is.windows || process.env.OSTYPE === "cygwin" || process.env.OSTYPE === "msys";

export const getNotFoundError = (cmd) => {
    const err = new adone.error.NotFoundException(`Not found: ${cmd}`);
    err.code = "ENOENT";
    return err;
};

export const getPathInfo = (cmd, { colon = delimiter, path = process.env.PATH || "", pathExt = process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM" } = {}) => {
    let env = path.split(colon);
    let ext = [""];

    let extExe = "";
    if (isWindows) {
        env.unshift(process.cwd());
        extExe = pathExt;
        ext = extExe.split(colon);


        // Always test the cmd itself first.  isexe will check to make sure
        // it's found in the pathExt set.
        if (cmd.includes(".") && ext[0] !== "") {
            ext.unshift("");
        }
    }

    // If it has a slash, then we don't bother searching the pathenv.
    // just check the file itself, and that's it.
    if (cmd.match(/\//) || isWindows && cmd.match(/\\/)) {
        env = [""];
    }

    return {
        env,
        ext,
        extExe
    };
};

export { join };
