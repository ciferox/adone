const signal = process.argv[2];
const gens = Number(process.argv[3]) || 0;

if (!signal || !isNaN(signal)) {
    throw new Error("signal not provided");
}

const spawn = require("child_process").spawn;
let file = require.resolve("./awaiter.js");
console.error(process.pid, signal, gens);

if (gens > 0) {
    file = __filename;
}

const child = spawn(process.execPath, [file, signal, gens - 1], {
    stdio: [0, "pipe", "pipe"]
});

if (!gens) {
    child.stderr.on("data", () => {
        child.kill(signal);
    });
}

let result = "";
child.stdout.on("data", (c) => {
    result += c;
});

child.on("close", (code, sig) => {
    try {
        result = JSON.parse(result);
    } catch (er) {
        console.log("%j", {
            error: "failed to parse json\n" + er.message,
            result,
            pid: process.pid,
            child: child.pid,
            gens,
            expect: [null, signal],
            actual: [code, sig]
        });
        return;
    }
    if (result.wanted[1] === true) {
        sig = Boolean(sig);
    }
    result.external = result.external || [code, sig];
    console.log("%j", result);
});
