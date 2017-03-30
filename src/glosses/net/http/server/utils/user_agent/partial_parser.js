const { util, net: { http: { server: { util: { userAgent } } } } } = adone;
const { _: { Device, UA } } = userAgent;

const replaceMatches = (str, m) => str.replace(/\${(\d+)}|\$(\d+)/g, (tmp, i, j) => {
    return m[(i || j)] || "";
}).trim();

export default class PartialParser {
    constructor(regexes = [], options = {}) {
        this.options = options;
        this.parsers = regexes.map((x) => this._make(x));
    }

    _replacePattern(regex) {
        const pattern = this.options.pattern || {};
        for (const p of util.keys(pattern)) {
            if (regex.includes(p)) {
                regex = regex.replace(p, pattern[p]);
            }
        }
        return regex;
    }

    _parse(parsers, str, preset) {
        let obj;
        for (const parser of parsers) {
            obj = parser(str, preset);
            if (obj) {
                if (obj.preset) {
                    preset = Object.assign(preset, obj);
                } else {
                    break;
                }
            }
        }
        return obj;
    }

    parse(str = "") {
        str = str.toString().substr(0, 500);
        const obj = this._parse(this.parsers, str, {});

        if (!this.options.device) {
            return new UA(obj);
        }
        return new Device(obj);
    }

    _regexp(obj) {
        let regex = this._replacePattern(obj.regex);
        regex = new RegExp(regex, obj.regex_flag);
        return regex;
    }

    _makeGroup(obj) {
        const regexp = this._regexp(obj);
        const parsers = (obj.group || []).map((x) => this._make(x));

        return (str, preset) => {
            const m = regexp.exec(str);
            if (!m) {
                return null;
            }

            return this._parse(parsers, str, preset);
        };
    }

    _make(obj) {
        const regexp = this._regexp(obj);

        if (obj.group) {
            return this._makeGroup(obj);
        } else if (!this.options.device) {
            return (str, preset) => {
                const m = regexp.exec(str);
                if (!m) {
                    return null;
                }

                preset = preset || {};
                const family = (obj.family ? replaceMatches(obj.family, m) : m[1]) || preset.family;
                const major = (obj.v1 ? replaceMatches(obj.v1, m) : m[2]) || preset.major;
                const minor = (obj.v2 ? replaceMatches(obj.v2, m) : m[3]) || preset.minor;
                const patch = (obj.v3 ? replaceMatches(obj.v3, m) : m[4]) || preset.patch;
                const type = (obj.type ? replaceMatches(obj.type, m) : undefined) || preset.type;
                let patchMinor;
                if (this.options.usePatchMinor) {
                    patchMinor = (obj.v4 ? replaceMatches(obj.v4, m) : m[5]) || preset.v4 || null;
                }
                const ret = new UA(family, major, minor, patch, patchMinor, type, obj.debug);

                if (obj.preset) {
                    ret.preset = true;
                }
                return ret;
            };
        }

        return (str, preset = {}) => {
            const m = regexp.exec(str);
            if (!m) {
                return null;
            }

            const family = (obj.device ? replaceMatches(obj.device, m) : m[1]) || preset.family;
            const brand = (obj.brand ? replaceMatches(obj.brand, m) : undefined) || preset.brand ||
                null;
            const model = (obj.model ? replaceMatches(obj.model, m) : m[1]) || preset.model;
            const type = (obj.type ? replaceMatches(obj.type, m) : undefined) || preset.type;
            const ret = new Device(family, brand, model, type, obj.debug);

            if (obj.preset) {
                ret.preset = true;
            }

            return ret;
        };
    }
}
