const os = require("os");
const common = require("../common");

common.register("cd", _cd, {});

//@
//@ ### cd([dir])
//@
//@ Changes to directory `dir` for the duration of the script. Changes to home
//@ directory if no argument is supplied.
function _cd(options, dir) {
    if (!dir) {
 dir = os.homedir(); 
}

    if (dir === "-") {
        if (!process.env.OLDPWD) {
            common.error("could not find previous directory");
        } else {
            dir = process.env.OLDPWD;
        }
    }

    try {
        const curDir = process.cwd();
        process.chdir(dir);
        process.env.OLDPWD = curDir;
    } catch (e) {
        // something went wrong, let's figure out the error
        let err;
        try {
            common.statFollowLinks(dir); // if this succeeds, it must be some sort of file
            err = `not a directory: ${  dir}`;
        } catch (e2) {
            err = `no such file or directory: ${  dir}`;
        }
        if (err) {
 common.error(err); 
}
    }
    return "";
}
module.exports = _cd;
