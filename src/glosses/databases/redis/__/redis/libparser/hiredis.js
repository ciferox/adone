const {
    is,
    lazify,
    nativeAddon
} = adone;

const lazy = lazify({
    hiredis: () => nativeAddon(adone.std.path.join(__dirname, "native", "hiredis.node"))
});

export default class HiredisReplyParser {
    constructor(options) {
        this.name = "hiredis";
        this.options = options;
        this.reader = new lazy.hiredis.Reader(options);
    }

    parseData() {
        try {
            return this.reader.get();
        } catch (err) {
            // Protocol errors land here
            // Reset the parser. Otherwise new commands can't be processed properly
            this.reader = new lazy.hiredis.Reader(this.options);
            this.returnFatalError(err);
        }
    }

    execute(data) {
        this.reader.feed(data);
        let reply = this.parseData();

        while (!is.undefined(reply)) {
            if (reply && reply.name === "Error") {
                this.returnError(reply);
            } else {
                this.returnReply(reply);
            }
            reply = this.parseData();
        }
    }
}
