const cp = require("child_process");
const path = require("path");
let count = 0;

while (count < 10) {
    // eslint-disable-next-line
    const child = cp.spawn("node", ["-e", "setInterval(() => {})"]);
    console.log("child pid: %s | count: %s", child.pid, ++count);
}
