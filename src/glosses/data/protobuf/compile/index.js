const encodings = require("./encodings");
const compileDecode = require("./decode");
const compileEncode = require("./encode");
const compileEncodingLength = require("./encoding-length");

const {
    data: { varint }
} = adone;

const flatten = function (values) {
    if (!values) {
        return null;
    }
    const result = {};
    Object.keys(values).forEach((k) => {
        result[k] = values[k].value;
    });
    return result;
};

export default function (schema, extraEncodings) {
    const messages = {};
    const enums = {};
    const cache = {};

    const visit = function (schema, prefix) {
        if (schema.enums) {
            schema.enums.forEach((e) => {
                e.id = prefix + (prefix ? "." : "") + e.name;
                enums[e.id] = e;
                visit(e, e.id);
            });
        }
        if (schema.messages) {
            schema.messages.forEach((m) => {
                m.id = prefix + (prefix ? "." : "") + m.name;
                messages[m.id] = m;
                m.fields.forEach((f) => {
                    if (!f.map) {
                        return;
                    }

                    const name = `Map_${f.map.from}_${f.map.to}`;
                    const map = {
                        name,
                        enums: [],
                        messages: [],
                        fields: [{
                            name: "key",
                            type: f.map.from,
                            tag: 1,
                            repeated: false,
                            required: true
                        }, {
                            name: "value",
                            type: f.map.to,
                            tag: 2,
                            repeated: false,
                            required: false
                        }],
                        extensions: null,
                        id: prefix + (prefix ? "." : "") + name
                    };

                    if (!messages[map.id]) {
                        messages[map.id] = map;
                        schema.messages.push(map);
                    }
                    f.type = name;
                    f.repeated = true;
                });
                visit(m, m.id);
            });
        }
    };

    visit(schema, "");

    const compileEnum = function (e) {
        const values = Object.keys(e.values || []).map((k) => {
            return parseInt(e.values[k].value, 10);
        });

        const encode = function encode(val, buf, offset) {
            if (!values.length || values.indexOf(val) === -1) {
                throw new Error(`Invalid enum value: ${val}`);
            }
            varint.encode(val, buf, offset);
            encode.bytes = varint.encode.bytes;
            return buf;
        };

        const decode = function decode(buf, offset) {
            const val = varint.decode(buf, offset);
            if (!values.length || values.indexOf(val) === -1) {
                throw new Error(`Invalid enum value: ${val}`);
            }
            decode.bytes = varint.decode.bytes;
            return val;
        };

        return encodings.make(0, encode, decode, varint.encodingLength);
    };

    let compileMessage = null;

    const resolve = function (name, from, compile) {
        if (extraEncodings && extraEncodings[name]) {
            return extraEncodings[name];
        }
        if (encodings[name]) {
            return encodings[name];
        }

        const m = (from ? `${from}.${name}` : name).split(".")
            .map((part, i, list) => {
                return list.slice(0, i).concat(name).join(".");
            })
            .reverse()
            .reduce((result, id) => {
                return result || messages[id] || enums[id];
            }, null);

        if (compile === false) {
            return m;
        }
        if (!m) {
            throw new Error(`Could not resolve ${name}`);
        }

        if (m.values) {
            return compileEnum(m);
        }
        const res = cache[m.id] || compileMessage(m, cache[m.id] = {});
        return res;
    };

    compileMessage = function (m, exports) {
        m.messages.forEach((nested) => {
            exports[nested.name] = resolve(nested.name, m.id);
        });

        m.enums.forEach((val) => {
            exports[val.name] = flatten(val.values);
        });

        exports.type = 2;
        exports.message = true;
        exports.name = m.name;

        const oneofs = {};

        m.fields.forEach((f) => {
            if (!f.oneof) {
                return;
            }
            if (!oneofs[f.oneof]) {
                oneofs[f.oneof] = [];
            }
            oneofs[f.oneof].push(f.name);
        });

        const enc = m.fields.map((f) => {
            return resolve(f.type, m.id);
        });

        const encodingLength = compileEncodingLength(m, enc, oneofs);
        const encode = compileEncode(m, resolve, enc, oneofs, encodingLength);
        const decode = compileDecode(m, resolve, enc);

        // end of compilation - return all the things

        encode.bytes = decode.bytes = 0;

        exports.buffer = true;
        exports.encode = encode;
        exports.decode = decode;
        exports.encodingLength = encodingLength;

        return exports;
    };

    return (schema.enums || []).concat((schema.messages || []).map((message) => {
        return resolve(message.id);
    }));
}
