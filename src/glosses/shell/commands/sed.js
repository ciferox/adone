const common = require("../common");
const fs = require("fs");

common.register("sed", _sed, {
    globStart: 3, // don't glob-expand regexes
    canReceivePipe: true,
    cmdOptions: {
        i: "inplace"
    }
});

//@
//@ ### sed([options,] search_regex, replacement, file [, file ...])
//@ ### sed([options,] search_regex, replacement, file_array)
//@
//@ Available options:
//@
//@ + `-i`: Replace contents of `file` in-place. _Note that no backups will be created!_
//@
//@ Examples:
//@
//@ ```javascript
//@ sed('-i', 'PROGRAM_VERSION', 'v0.1.3', 'source.js');
//@ sed(/.*DELETE_THIS_LINE.*\n/, '', 'source.js');
//@ ```
//@
//@ Reads an input string from `file`s, and performs a JavaScript `replace()` on the input
//@ using the given `search_regex` and `replacement` string or function. Returns the new string after replacement.
//@
//@ Note:
//@
//@ Like unix `sed`, ShellJS `sed` supports capture groups. Capture groups are specified
//@ using the `$n` syntax:
//@
//@ ```javascript
//@ sed(/(\w+)\s(\w+)/, '$2, $1', 'file.txt');
//@ ```
function _sed(options, regex, replacement, files) {
    // Check if this is coming from a pipe
    const pipe = common.readFromPipe();

    if (!is.string(replacement) && !is.function(replacement)) {
        if (is.number(replacement)) {
            replacement = replacement.toString(); // fallback
        } else {
            common.error("invalid replacement string");
        }
    }

    // Convert all search strings to RegExp
    if (is.string(regex)) {
        regex = RegExp(regex);
    }

    if (!files && !pipe) {
        common.error("no files given");
    }

    files = [].slice.call(arguments, 3);

    if (pipe) {
        files.unshift("-");
    }

    const sed = [];
    files.forEach((file) => {
        if (!fs.existsSync(file) && file !== "-") {
            common.error("no such file or directory: " + file, 2, { continue: true });
            return;
        }

        let contents = file === "-" ? pipe : fs.readFileSync(file, "utf8");
        let lines = contents.split("\n");
        let result = lines.map((line) => {
            return line.replace(regex, replacement);
        }).join("\n");

        sed.push(result);

        if (options.inplace) {
            fs.writeFileSync(file, result, "utf8");
        }
    });

    return sed.join("\n");
}
module.exports = _sed;
