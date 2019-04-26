const fs = require("fs");
const path = require("path");
const extend = require("extend-shallow");
const { match } = adone.glob;

const parse = (fp) => {
    const str = fs.readFileSync(fp, "utf8");
    const lines = str.split("\n");
    const len = lines.length;
    let idx = -1;
    const tests = [];

    while (++idx < len) {
        const line = lines[idx].trim();

        if (!line) {
            continue;
        }
        if (/^#\s\w/.test(line)) {
            tests.push(line.replace(/^[#\s]+/, "").toLowerCase());
            continue;
        }
        if (!/^[tf] /.test(line)) {
            continue;
        }

        const segs = line.split(/\s+/).filter(Boolean);
        if (segs.length !== 3) {
            continue;
        }
        tests.push([segs[1], segs[2], segs[0] === "t"]);
    }
    return tests.filter(Boolean);
};

/**
 * Parse bash test files
 */
export default function parseFiles(pattern, options) {
    const opts = extend({ cwd: process.cwd() }, options);
    const cwd = opts.cwd;

    const files = match(fs.readdirSync(cwd), pattern);
    const tests = {};

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const name = path.basename(file, path.extname(file));
        tests[name] = parse(path.join(cwd, file));
    }
    return tests;
}
