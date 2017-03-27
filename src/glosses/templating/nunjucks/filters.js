import { TemplateError } from "./x";
import * as runtime from "./runtime";

const { is, util, net: { http: { server: { helper } } } } = adone;

const normalize = (value, defaultValue) => {
    if (is.nil(value) || value === false) {
        return defaultValue;
    }
    return value;
};

const filters = {
    abs: Math.abs,

    batch: (arr, linecount, fill) => {
        const res = [];
        let tmp = [];
        let i;
        for (i = 0; i < arr.length; i++) {
            if (i % linecount === 0 && tmp.length) {
                res.push(tmp);
                tmp = [];
            }
            tmp.push(arr[i]);
        }
        if (tmp.length) {
            if (fill) {
                for (i = tmp.length; i < linecount; i++) {
                    tmp.push(fill);
                }
            }
            res.push(tmp);
        }
        return res;
    },

    capitalize: (str) => {
        str = normalize(str, "");
        const ret = str.toLowerCase();
        return runtime.copySafeness(str, ret.charAt(0).toUpperCase() + ret.slice(1));
    },

    center: (str, width = 80) => {
        str = normalize(str, "");

        if (str.length >= width) {
            return str;
        }

        const spaces = width - str.length;
        const pre = " ".repeat(Math.ceil(spaces / 2 - spaces % 2));
        const post = " ".repeat(Math.ceil(spaces / 2));
        return runtime.copySafeness(str, pre + str + post);
    },

    default: (val, def, bool) => {
        if (bool) {
            return val ? val : def;
        }
        return !is.undefined(val) ? val : def;
    },

    dictsort: (val, caseSensitive, by) => {
        if (!is.object(val)) {
            throw new TemplateError("dictsort filter: val must be an object");
        }

        const array = util.entries(val, { followProto: true });

        let si;
        if (is.undefined(by) || by === "key") {
            si = 0;
        } else if (by === "value") {
            si = 1;
        } else {
            throw new TemplateError("dictsort filter: You can only sort by either key or value");
        }

        array.sort((t1, t2) => {
            let a = t1[si];
            let b = t2[si];

            if (!caseSensitive) {
                if (is.string(a)) {
                    a = a.toUpperCase();
                }
                if (is.string(b)) {
                    b = b.toUpperCase();
                }
            }

            return a > b ? 1 : (a === b ? 0 : -1);
        });

        return array;
    },

    dump: (obj, spaces) => JSON.stringify(obj, null, spaces),

    escape: (str) => {
        if (str instanceof runtime.SafeString) {
            return str;
        }
        str = is.nil(str) ? "" : str;
        return runtime.markSafe(helper.escapeHTML(str.toString()));
    },

    safe: (str) => {
        if (str instanceof runtime.SafeString) {
            return str;
        }
        str = is.nil(str) ? "" : str;
        return runtime.markSafe(str.toString());
    },

    first: (arr) => arr[0],

    groupby: (obj, val) => {
        const result = {};
        const iterator = is.function(val) ? val : (obj) => obj[val];
        for (let i = 0; i < obj.length; i++) {
            const value = obj[i];
            const key = iterator(value, i);
            if (!result[key]) {
                result[key] = [];
            }
            result[key].push(value);
        }
        return result;
    },

    indent: (str, width = 4, indentfirst) => {
        str = normalize(str, "");

        if (str === "") {
            return "";
        }

        let res = "";
        const lines = str.split("\n");
        const sp = " ".repeat(width);

        for (let i = 0; i < lines.length; i++) {
            if (i === 0 && !indentfirst) {
                res += `${lines[i]}\n`;
            } else {
                res += `${sp + lines[i]}\n`;
            }
        }

        return runtime.copySafeness(str, res);
    },

    join: (arr, del = "", attr) => {
        if (attr) {
            arr = arr.map((x) => x[attr]);
        }

        return arr.join(del);
    },

    last: (arr) => arr[arr.length - 1],

    length: (val) => {
        const value = normalize(val, "");

        if (!is.undefined(value)) {
            if (is.map(value) || is.set(value)) {
                return value.size;
            }
            if (is.array(value) || value instanceof runtime.SafeString) {
                return value.length;
            }

            return util.keys(value).length;
        }
        return 0;
    },

    list: (val) => {
        if (is.string(val)) {
            return val.split("");
        }
        if (is.array(val)) {
            return val;
        }
        if (is.object(val)) {
            return util.entries(val).map(([key, value]) => ({ key, value }));
        }
        throw new TemplateError("list filter: type not iterable");
    },

    lower: (str) => {
        str = normalize(str, "");
        return str.toLowerCase();
    },

    nl2br: (str) => {
        if (is.nil(str)) {
            return "";
        }
        return runtime.copySafeness(str, str.replace(/\r\n|\n/g, "<br />\n"));
    },

    random: (arr) => arr[Math.floor(Math.random() * arr.length)],

    rejectattr: (arr, attr) => arr.filter((item) => !item[attr]),

    selectattr: (arr, attr) => arr.filter((item) => Boolean(item[attr])),

    replace: (str, old, new_, maxCount) => {
        const originalStr = str;

        if (old instanceof RegExp) {
            return str.replace(old, new_);
        }

        if (is.undefined(maxCount)) {
            maxCount = -1;
        }

        let res = "";

        if (is.number(old)) {
            old = `${old}`;
        } else if (!is.string(old)) {
            return str;
        }

        if (is.number(str)) {
            str = String(str);
        }

        if (!is.string(str) && !(str instanceof runtime.SafeString)) {
            return str;
        }

        if (old === "") {
            // Mimic the python behaviour: empty string is replaced by replacement
            // e.g. "abc"|replace("", ".") -> .a.b.c.
            res = `${new_}${str.split("").join(new_)}${new_}`;
            return runtime.copySafeness(str, res);
        }

        let nextIndex = str.indexOf(old);
        if (maxCount === 0 || nextIndex === -1) {
            return str;
        }

        let pos = 0;
        let count = 0;

        while (nextIndex > -1 && (maxCount === -1 || count < maxCount)) {
            res += str.substring(pos, nextIndex) + new_;
            pos = nextIndex + old.length;
            count++;
            nextIndex = str.indexOf(old, pos);
        }

        if (pos < str.length) {
            res += str.substring(pos);
        }

        return runtime.copySafeness(originalStr, res);
    },

    reverse: (val) => {
        let arr;
        if (is.string(val)) {
            arr = filters.list(val);
        } else {
            arr = [...val];
        }

        arr.reverse();

        if (is.string(val)) {
            return runtime.copySafeness(val, arr.join(""));
        }
        return arr;
    },

    round: (val, precision = 0, method) => {
        const factor = Math.pow(10, precision);
        let rounder;

        if (method === "ceil") {
            rounder = Math.ceil;
        } else if (method === "floor") {
            rounder = Math.floor;
        } else {
            rounder = Math.round;
        }

        return rounder(val * factor) / factor;
    },

    slice: (arr, slices, fillWith) => {
        const sliceLength = Math.floor(arr.length / slices);
        const extra = arr.length % slices;
        let offset = 0;
        const res = [];

        for (let i = 0; i < slices; i++) {
            const start = offset + i * sliceLength;
            if (i < extra) {
                offset++;
            }
            const end = offset + (i + 1) * sliceLength;

            const slice = arr.slice(start, end);
            if (fillWith && i >= extra) {
                slice.push(fillWith);
            }
            res.push(slice);
        }

        return res;
    },

    sum: (arr, attr, start) => {
        let sum = 0;

        if (is.number(start)) {
            sum += start;
        }

        if (!is.nil(attr)) {
            arr = arr.map((x) => x[attr]);
        }

        for (let i = 0; i < arr.length; i++) {
            sum += arr[i];
        }

        return sum;
    },

    sort: runtime.makeMacro(["value", "reverse", "case_sensitive", "attribute"], [], (arr, reverse, caseSens, attr) => {
        arr = [...arr];

        arr.sort((a, b) => {
            let x;
            let y;

            if (attr) {
                x = a[attr];
                y = b[attr];
            } else {
                x = a;
                y = b;
            }

            if (!caseSens && is.string(x) && is.string(y)) {
                x = x.toLowerCase();
                y = y.toLowerCase();
            }

            if (x < y) {
                return reverse ? 1 : -1;
            } else if (x > y) {
                return reverse ? -1 : 1;
            } else {
                return 0;
            }
        });

        return arr;
    }),

    string: (obj) => runtime.copySafeness(obj, obj),

    striptags: (input, preserveLinebreaks) => {
        input = normalize(input, "");
        preserveLinebreaks = preserveLinebreaks || false;
        const tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>|<!--[\s\S]*?-->/gi;
        const trimmedInput = filters.trim(input.replace(tags, ""));
        let res = "";
        if (preserveLinebreaks) {
            res = trimmedInput
                .replace(/^ +| +$/gm, "")
                .replace(/ +/g, " ")
                .replace(/(\r\n)/g, "\n")
                .replace(/\n\n\n+/g, "\n\n");
        } else {
            res = trimmedInput.replace(/\s+/gi, " ");
        }
        return runtime.copySafeness(input, res);
    },

    title: (str) => {
        str = normalize(str, "");
        const words = str.split(" ");
        for (let i = 0; i < words.length; i++) {
            words[i] = filters.capitalize(words[i]);
        }
        return runtime.copySafeness(str, words.join(" "));
    },

    trim: (str) => runtime.copySafeness(str, str.replace(/^\s*|\s*$/g, "")),

    truncate: (input, length = 255, killwords, end) => {
        const orig = input;
        input = normalize(input, "");

        if (input.length <= length) {
            return input;
        }

        if (killwords) {
            input = input.substring(0, length);
        } else {
            let idx = input.lastIndexOf(" ", length);
            if (idx === -1) {
                idx = length;
            }

            input = input.substring(0, idx);
        }

        input += !is.nil(end) ? end : "...";
        return runtime.copySafeness(orig, input);
    },

    upper: (str) => normalize(str, "").toUpperCase(),

    urlencode: (obj) => {
        const enc = encodeURIComponent;
        if (is.string(obj)) {
            return enc(obj);
        } else {
            const parts = is.array(obj) ? obj : util.entries(obj);
            return parts.map(([k, v]) => `${enc(k)}=${enc(v)}`).join("&");
        }
    },

    urlize: (str, length, nofollow) => {
        if (isNaN(length)) {
            length = Infinity;
        }

        const noFollowAttr = nofollow === true ? ' rel="nofollow"' : "";

        // For the jinja regexp, see
        // https://github.com/mitsuhiko/jinja2/blob/f15b814dcba6aa12bc74d1f7d0c881d55f7126be/jinja2/utils.py#L20-L23
        const puncRE = /^(?:\(|<|&lt;)?(.*?)(?:\.|,|\)|\n|&gt;)?$/;
        // from http://blog.gerv.net/2011/05/html5_email_address_regexp/
        const emailRE = /^[\w.!#$%&'*+\-\/=?\^`{|}~]+@[a-z\d\-]+(\.[a-z\d\-]+)+$/i;
        const httpHttpsRE = /^https?:\/\/.*$/;
        const wwwRE = /^www\./;
        const tldRE = /\.(?:org|net|com)(?:\:|\/|$)/;

        const words = str.split(/(\s+)/).filter((word) => {
            // If the word has no length, bail.
            // This can happen for str with trailing whitespace.
            return word && word.length;
        }).map((word) => {
            const matches = word.match(puncRE);
            const possibleUrl = matches && matches[1] || word;

            // url that starts with http or https
            if (httpHttpsRE.test(possibleUrl)) {
                return `<a href="${possibleUrl}"${noFollowAttr}>${possibleUrl.substr(0, length)}</a>`;
            }

            // url that starts with www.
            if (wwwRE.test(possibleUrl)) {
                return `<a href="http://${possibleUrl}"${noFollowAttr}>${possibleUrl.substr(0, length)}</a>`;
            }

            // an email address of the form username@domain.tld
            if (emailRE.test(possibleUrl)) {
                return `<a href="mailto:${possibleUrl}">${possibleUrl}</a>`;
            }

            // url that ends in .com, .org or .net that is not an email address
            if (tldRE.test(possibleUrl)) {
                return `<a href="http://${possibleUrl}"${noFollowAttr}>${possibleUrl.substr(0, length)}</a>`;
            }

            return word;

        });

        return words.join("");
    },

    wordcount: (str) => {
        str = normalize(str, "");
        const words = (str) ? str.match(/\w+/g) : null;
        return (words) ? words.length : null;
    },

    float: (val, def) => {
        const res = parseFloat(val);
        return isNaN(res) ? def : res;
    },

    int: (val, def) => {
        const res = parseInt(val, 10);
        return isNaN(res) ? def : res;
    }
};

filters.d = filters.default;
filters.e = filters.escape;

export default filters;
