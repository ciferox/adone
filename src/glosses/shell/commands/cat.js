const common = require("../common");
const fs = require("fs");

common.register("cat", _cat, {
    canReceivePipe: true,
    cmdOptions: {
        n: "number"
    }
});

//@
//@ ### cat([options,] file [, file ...])
//@ ### cat([options,] file_array)
//@
//@ Available options:
//@
//@ + `-n`: number all output lines
//@
//@ Examples:
//@
//@ ```javascript
//@ var str = cat('file*.txt');
//@ var str = cat('file1', 'file2');
//@ var str = cat(['file1', 'file2']); // same as above
//@ ```
//@
//@ Returns a string containing the given file, or a concatenated string
//@ containing the files if more than one file is given (a new line character is
//@ introduced between each file).
function _cat(options, files) {
    let cat = common.readFromPipe();

    if (!files && !cat) {
 common.error("no paths given");
 }

    files = [].slice.call(arguments, 1);

    files.forEach((file) => {
        if (!fs.existsSync(file)) {
            common.error("no such file or directory: " + file);
        } else if (common.statFollowLinks(file).isDirectory()) {
            common.error(`${file  }: Is a directory`);
        }

        cat += fs.readFileSync(file, "utf8");
    });

    if (options.number) {
        cat = addNumbers(cat);
    }

    return cat;
}
module.exports = _cat;

function addNumbers(cat) {
    let lines = cat.split("\n");
    let lastLine = lines.pop();

    lines = lines.map((line, i) => {
        return numberedLine(i + 1, line);
    });

    if (lastLine.length) {
        lastLine = numberedLine(lines.length + 1, lastLine);
    }
    lines.push(lastLine);

    return lines.join("\n");
}

function numberedLine(n, line) {
    // GNU cat use six pad start number + tab. See http://lingrok.org/xref/coreutils/src/cat.c#57
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart
    const number = `${("     " + n).slice(-6)}\t`;
    return number + line;
}
