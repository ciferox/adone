import compile from "./compile";

const {
    is
} = adone;

const __ = adone.lazify({
    schema: "./schema"
}, adone.asNamespace(exports), require);


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

export const create = function (proto, opts) {
    if (!opts) {
        opts = {};
    }
    if (!proto) {
        throw new Error("Pass in a .proto string or a protobuf-schema parsed object");
    }

    const sch = (typeof proto === "object" && !is.buffer(proto)) ? proto : __.schema.parse(proto);

    // to not make toString,toJSON enumarable we make a fire-and-forget prototype
    const Messages = function () {
        const self = this;

        compile(sch, opts.encodings || {}).forEach((m) => {
            self[m.name] = flatten(m.values) || m;
        });
    };

    Messages.prototype.toString = function () {
        return __.schema.stringify(sch);
    };

    Messages.prototype.toJSON = function () {
        return sch;
    };

    return new Messages();
};
