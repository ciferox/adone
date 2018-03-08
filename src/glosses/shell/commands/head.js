const common = require("../common");
const fs = require("fs");

common.register("head", _head, {
    canReceivePipe: true,
    cmdOptions: {
        n: "numLines"
    }
});

// Reads |numLines| lines or the entire file, whichever is less.
function readSomeLines(file, numLines) {
    const buf = common.buffer();
    const bufLength = buf.length;
    let bytesRead = bufLength;
    let pos = 0;

    const fdr = fs.openSync(file, "r");
    let numLinesRead = 0;
    let ret = "";
    while (bytesRead === bufLength && numLinesRead < numLines) {
        bytesRead = fs.readSync(fdr, buf, 0, bufLength, pos);
        const bufStr = buf.toString("utf8", 0, bytesRead);
        numLinesRead += bufStr.split("\n").length - 1;
        ret += bufStr;
        pos += bytesRead;
    }

    fs.closeSync(fdr);
    return ret;
}

//@
//@ ### head([{'-n': \<num\>},] file [, file ...])
//@ ### head([{'-n': \<num\>},] file_array)
//@
//@ Available options:
//@
//@ + `-n <num>`: Show the first `<num>` lines of the files
//@
//@ Examples:
//@
//@ ```javascript
//@ var str = head({'-n': 1}, 'file*.txt');
//@ var str = head('file1', 'file2');
//@ var str = head(['file1', 'file2']); // same as above
//@ ```
//@
//@ Read the start of a file.
function _head(options, files) {
    let head = [];
    const pipe = common.readFromPipe();

    if (!files && !pipe) {
 common.error("no paths given");
 }

    let idx = 1;
    if (options.numLines === true) {
        idx = 2;
        options.numLines = Number(arguments[1]);
    } else if (options.numLines === false) {
        options.numLines = 10;
    }
    files = [].slice.call(arguments, idx);

    if (pipe) {
        files.unshift("-");
    }

    let shouldAppendNewline = false;
    files.forEach((file) => {
        if (file !== "-") {
            if (!fs.existsSync(file)) {
                common.error("no such file or directory: " + file, { continue: true });
                return;
            } else if (common.statFollowLinks(file).isDirectory()) {
                common.error(`error reading '${  file  }': Is a directory`, {
                    continue: true
                });
                return;
            }
        }

        let contents;
        if (file === "-") {
            contents = pipe;
        } else if (options.numLines < 0) {
            contents = fs.readFileSync(file, "utf8");
        } else {
            contents = readSomeLines(file, options.numLines);
        }

        let lines = contents.split("\n");
        let hasTrailingNewline = (lines[lines.length - 1] === "");
        if (hasTrailingNewline) {
            lines.pop();
        }
        shouldAppendNewline = (hasTrailingNewline || options.numLines < lines.length);

        head = head.concat(lines.slice(0, options.numLines));
    });

    if (shouldAppendNewline) {
        head.push(""); // to add a trailing newline once we join
    }
    return head.join("\n");
}
module.exports = _head;
