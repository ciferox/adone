const {
    app: { report }
} = adone;

report.setEvents("exception+fatalerror+signal+apicall");

class MyRecord {
    constructor() {
        this.name = "foo";
        this.id = 128;
        this.account = 98454324;
    }
}

const list = [];
while (true) {
    const record = new MyRecord();
    list.push(record);
}
