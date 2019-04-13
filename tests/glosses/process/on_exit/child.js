require("a");

const {
    process: { onExit }
} = adone;

for (let i = 0; i < 15; i++) {
    onExit(() => {
        console.log("ok");
    });
}
