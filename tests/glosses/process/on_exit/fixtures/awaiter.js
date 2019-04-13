require("a");

const {
    process: { onExit }
} = adone;

const expectSignal = process.argv[2];
let wanted;

if (!expectSignal || !isNaN(expectSignal)) {
    throw new Error("signal not provided");
}

onExit((code, signal) => {
    // some signals don't always get recognized properly, because
    // they have the same numeric code.
    if (wanted[1] === true) {
        signal = Boolean(signal);
    }
    console.log("%j", {
        found: [code, signal],
        wanted
    });
});

switch (expectSignal) {
    case "SIGIOT":
    case "SIGUNUSED":
    case "SIGPOLL":
        wanted = [null, true];
        break;
    default:
        wanted = [null, expectSignal];
        break;
}

console.error("want", wanted);

setTimeout(() => { }, 1000);
