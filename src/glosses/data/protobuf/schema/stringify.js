const {
    is
} = adone;

const onfield = function (f, result) {
    let prefix = f.repeated ? "repeated" : f.required ? "required" : "optional";
    if (f.type === "map") {
        prefix = `map<${f.map.from},${f.map.to}>`;
    }
    if (f.oneof) {
        prefix = "";
    }

    let opts = Object.keys(f.options || {}).map((key) => {
        return `${key} = ${f.options[key]}`;
    }).join(",");

    if (opts) {
        opts = ` [${opts}]`;
    }

    result.push(`${(prefix ? `${prefix} ` : "") + (f.map === "map" ? "" : `${f.type} `) + f.name} = ${f.tag}${opts};`);
    return result;
};

const onenumvalue = function (v, result) {
    let opts = Object.keys(v.options || {}).map((key) => {
        return `${key} = ${v.options[key]}`;
    }).join(",");

    if (opts) {
        opts = ` [${opts}]`;
    }
    const val = v.value + opts;
    return val;
};

const onoptionMap = function (o, result) {
    const keys = Object.keys(o);
    keys.forEach((k) => {
        let v = o[k];

        const type = typeof v;

        if (type === "object") {
            if (is.array(v)) {
                v.forEach((v) => {
                    v = onoptionMap(v, []);
                    if (v.length) {
                        result.push(`${k} {`, v, "}");
                    }
                });
            } else {
                v = onoptionMap(v, []);
                if (v.length) {
                    result.push(`${k} {`, v, "}");
                }
            }
        } else {
            if (type === "string") {
                v = `"${v}"`;
            }
            result.push(`${k}: ${v}`);
        }
    });

    return result;
};

const onoption = function (o, result) {
    const keys = Object.keys(o);
    keys.forEach((option) => {
        let v = o[option];
        if (~option.indexOf(".")) {
            option = `(${option})`;
        }

        const type = typeof v;

        if (type === "object") {
            v = onoptionMap(v, []);
            if (v.length) {
                result.push(`option ${option} = {`, v, "};");
            }
        } else {
            if (type === "string" && option !== "optimize_for") {
                v = `"${v}"`;
            }
            result.push(`option ${option} = ${v};`);
        }
    });
    if (keys.length > 0) {
        result.push("");
    }

    return result;
};

const onenum = function (e, result) {
    result.push(`enum ${e.name} {`);
    if (!e.options) {
        e.options = {};
    }
    const options = onoption(e.options, []);
    if (options.length > 1) {
        result.push(options.slice(0, -1));
    }
    Object.keys(e.values).map((v) => {
        const val = onenumvalue(e.values[v]);
        result.push([`${v} = ${val};`]);
    });
    result.push("}", "");
    return result;
};


const onmessage = function (m, result) {
    result.push(`message ${m.name} {`);

    if (!m.enums) {
        m.enums = [];
    }
    m.enums.forEach((e) => {
        result.push(onenum(e, []));
    });

    if (!m.messages) {
        m.messages = [];
    }
    m.messages.forEach((m) => {
        result.push(onmessage(m, []));
    });

    const oneofs = {};

    if (!m.fields) {
        m.fields = [];
    }
    m.fields.forEach((f) => {
        if (f.oneof) {
            if (!oneofs[f.oneof]) {
                oneofs[f.oneof] = [];
            }
            oneofs[f.oneof].push(onfield(f, []));
        } else {
            result.push(onfield(f, []));
        }
    });

    Object.keys(oneofs).forEach((n) => {
        oneofs[n].unshift(`oneof ${n} {`);
        oneofs[n].push("}");
        result.push(oneofs[n]);
    });

    result.push("}", "");
    return result;
};

const onrpc = function (rpc, result) {
    let def = `rpc ${rpc.name}(`;
    if (rpc.client_streaming) {
        def += "stream ";
    }
    def += `${rpc.input_type}) returns (`;
    if (rpc.server_streaming) {
        def += "stream ";
    }
    def += `${rpc.output_type})`;

    if (!rpc.options) {
        rpc.options = {};
    }

    const options = onoption(rpc.options, []);
    if (options.length > 1) {
        result.push(`${def} {`, options.slice(0, -1), "}");
    } else {
        result.push(`${def};`);
    }

    return result;
};

const onservices = function (s, result) {
    result.push(`service ${s.name} {`);

    if (!s.options) {
        s.options = {};
    }
    onoption(s.options, result);
    if (!s.methods) {
        s.methods = [];
    }
    s.methods.forEach((m) => {
        result.push(onrpc(m, []));
    });

    result.push("}", "");
    return result;
};

const indent = function (lvl) {
    return function (line) {
        if (is.array(line)) {
            return line.map(indent(`${lvl}  `)).join("\n");
        }
        return lvl + line;
    };
};

export default function (schema) {
    const result = [];

    result.push(`syntax = "proto${schema.syntax}";`, "");

    if (schema.package) {
        result.push(`package ${schema.package};`, "");
    }

    if (!schema.options) {
        schema.options = {};
    }

    onoption(schema.options, result);

    if (!schema.enums) {
        schema.enums = [];
    }
    schema.enums.forEach((e) => {
        onenum(e, result);
    });

    if (!schema.messages) {
        schema.messages = [];
    }
    schema.messages.forEach((m) => {
        onmessage(m, result);
    });

    if (schema.services) {
        schema.services.forEach((s) => {
            onservices(s, result);
        });
    }
    return result.map(indent("")).join("\n");
};
