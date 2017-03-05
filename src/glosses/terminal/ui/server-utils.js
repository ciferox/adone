
const url = require("url");
const contrib = require("../index");
const blessed = require("blessed");

function OutputBuffer(options) {
    this.isTTY = true;
    this.columns = options.cols;
    this.rows = options.rows;
    this.write = function (s) {
        s = s.replace("\x1b8", ""); //not clear from where in blessed this code comes from. It forces the terminal to clear and loose existing content.
        options.res.write(s);
    };

    this.on = function () { };
}

function InputBuffer(options) {
    this.isTTY = true;
    this.isRaw = true;

    this.emit = function () { };

    this.setRawMode = function () { };
    this.resume = function () { };
    this.pause = function () { };

    this.on = function () { };
}

function serverError(req, res, err) {
    setTimeout(() => {
        if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "text/plain" });
        }
        res.write(`\r\n\r\n${err}\r\n\r\n`);
        //restore cursor
        res.end("033[?25h");
    }, 0);

    return true;
}


function createScreen(req, res) {
    const query = url.parse(req.url, true).query;

    const cols = query.cols || 250;
    const rows = query.rows || 50;

    if (cols <= 35 || cols >= 500 || rows <= 5 || rows >= 300) {
        serverError(req, res, "cols must be bigger than 35 and rows must be bigger than 5");
        return null;
    }

    res.writeHead(200, { "Content-Type": "text/plain" });

    const output = new contrib.OutputBuffer({ res, cols, rows });
    const input = new contrib.InputBuffer(); //required to run under forever since it replaces stdin to non-tty
    const program = blessed.program({ output, input });

    if (query.terminal) {
        program.terminal = query.terminal;
    }
    if (query.isOSX) {
        program.isOSXTerm = query.isOSX;
    }
    if (query.isiTerm2) {
        program.isiTerm2 = query.isiTerm2;
    }

    const screen = blessed.screen({ program });
    return screen;
}


exports.createScreen = createScreen;
exports.OutputBuffer = OutputBuffer;
exports.InputBuffer = InputBuffer;
exports.serverError = serverError;
