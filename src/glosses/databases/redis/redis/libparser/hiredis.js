

const imports = adone.lazify({
    hiredis: () => adone.bind("hiredis.node")
});

export default class HiredisReplyParser {
    constructor(options) {
        this.name = "hiredis";
        this.options = options;
        this.reader = new imports.hiredis.Reader(options);
    }

    parseData() {
        try {
            return this.reader.get();
        } catch (err) {
            // Protocol errors land here
            // Reset the parser. Otherwise new commands can't be processed properly
            this.reader = new imports.hiredis.Reader(this.options);
            this.returnFatalError(err);
        }
    }

    execute(data) {
        this.reader.feed(data);
        let reply = this.parseData();

        while (reply !== undefined) {
            if (reply && reply.name === "Error") {
                this.returnError(reply);
            } else {
                this.returnReply(reply);
            }
            reply = this.parseData();
        }
    }
}