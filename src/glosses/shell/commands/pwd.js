const path = require("path");
const common = require("../common");

common.register("pwd", _pwd, {
    allowGlobbing: false
});

//@
//@ ### pwd()
//@
//@ Returns the current directory.
function _pwd() {
    const pwd = path.resolve(process.cwd());
    return pwd;
}
module.exports = _pwd;
