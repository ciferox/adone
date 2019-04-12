const cp = require("child_process");
const path = require("path");
let count = 0;

while (count < 10) {
    // eslint-disable-next-line
    const child = cp.exec(`node ${path.join(__dirname, "child.js")}`, (error, stdout, stderr) => {
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
        if (error !== null) {
            console.log(`exec error: ${error}`);
        }
    });

    console.log("child pid: %s | count: %s", child.pid, ++count);
}
