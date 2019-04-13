require("a");

let counter = 0;

adone.process.onExit((code, signal) => {
    counter++;
    console.log("last counter=%j, code=%j, signal=%j",
        counter, code, signal);
}, { alwaysLast: true });

adone.process.onExit((code, signal) => {
    counter++;
    console.log("first counter=%j, code=%j, signal=%j",
        counter, code, signal);
});
