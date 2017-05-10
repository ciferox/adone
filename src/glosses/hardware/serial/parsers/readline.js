export default class ReadlineParser extends adone.hardware.serial.parser.Delimiter {
    constructor(options = {}) {
        if (adone.is.undefined(options.delimiter)) {
            options.delimiter = Buffer.from("\n", "utf8");
        }

        super(options);

        const encoding = options.encoding || "utf8";
        this.delimiter = Buffer.from(options.delimiter, encoding);
        this.setEncoding(encoding);
    }
}
