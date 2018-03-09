const {
    application: { report }
} = adone;

report.setEvents("exception+fatalerror+signal+apicall");

class MyRecord {
    constructor() {
        this.name = "foo";
        this.id = 128;
        this.account = 98454324;
    }
}

// Exit on loss of parent process
process.on("disconnect", () => process.exit(2));

const busyLoop = function () {
    const list = [];
    for (let i = 0; i < 1e10; i++) {
        for (let j = 0; j < 1000; j++) {
            list.push(new MyRecord());
        }
        for (let k = 0; k < 1000; k++) {
            list[k].id += 1;
            list[k].account += 2;
        }
        for (let l = 0; l < 1000; l++) {
            list.pop();
        }
    }
};

process.send("child started", busyLoop);
