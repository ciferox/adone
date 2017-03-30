const { x, std: { path }, fs, is } = adone;

export const _ = adone.lazify({
    UA: "./ua",
    Device: "./device",
    PartialParser: "./partial_parser"
}, null, require);

const defaultFile = path.join(
    adone.appinstance.adoneEtcPath,
    "glosses",
    "net",
    "http",
    "server",
    "utils",
    "user_agent",
    "regexes.yml"
);

class Parser {
    constructor() {
        this.regexes = null;
    }

    parse(str) {
        return {
            ua: this.parseUA(str),
            engine: this.parseEngine(str),
            os: this.parseOS(str),
            device: this.parseDevice(str)
        };
    }

    parseUA(str) {
        return this.uaParser.parse(str);
    }

    parseEngine(str) {
        return this.engineParser.parse(str);
    }

    parseOS(str) {
        return this.osParser.parse(str);
    }

    parseDevice(str) {
        return this.deviceParser.parse(str);
    }

    createParsers() {
        if (is.null(this.regexes)) {
            throw new x.IllegalState("regexes must be loaded");
        }
        const {
            pattern,
            user_agent_parsers: ua,
            engine_parsers: engine,
            os_parsers: os,
            device_parsers: device
        } = this.regexes;
        this.uaParser = new _.PartialParser(ua, { pattern });
        this.engineParser = new _.PartialParser(engine, { pattern });
        this.osParser = new _.PartialParser(os, { pattern, usePatchMinor: true });
        this.deviceParser = new _.PartialParser(device, { pattern, device: true });
    }

    loadSync(file) {
        if (fs.existsSync(file)) {
            const data = fs.readFileSync(file);
            this.regexes = adone.data.yaml.safeLoad(data);
            this.createParsers();
        } else {
            throw new x.InvalidArgument(`No such file: ${file}`);
        }
    }

    async load(file) {
        if (await fs.exists(file)) {
            const data = await fs.readFile(file);
            this.regexes = adone.data.yaml.safeLoad(data);
            this.createParsers();
        } else {
            throw new x.InvalidArgument(`No such file: ${file}`);
        }
    }
}

export const createParser = ({ async = false, file = defaultFile } = {}) => {
    const parser = new Parser();
    if (async) {
        return parser.load(file).then(() => parser);
    }
    parser.loadSync(file);
    return parser;
};


