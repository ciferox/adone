import tokenize from "./tokenize";

const {
    is
} = adone;

const MAX_RANGE = 0x1FFFFFFF;

// "Only repeated fields of primitive numeric types (types which use the varint, 32-bit, or 64-bit wire types) can be declared "packed"."
// https://developers.google.com/protocol-buffers/docs/encoding#optional
const PACKABLE_TYPES = [
    // varint wire types
    "int32", "int64", "uint32", "uint64", "sint32", "sint64", "bool",
    // + ENUMS
    // 64-bit wire types
    "fixed64", "sfixed64", "double",
    // 32-bit wire types
    "fixed32", "sfixed32", "float"
];

const onfieldoptions = function (tokens) {
    const opts = {};

    while (tokens.length) {
        switch (tokens[0]) {
            case "[":
            case ",": {
                tokens.shift();
                let name = tokens.shift();
                if (name === "(") { // handling [(A) = B]
                    name = tokens.shift();
                    tokens.shift(); // remove the end of bracket
                }
                if (tokens[0] !== "=") {
                    throw new Error(`Unexpected token in field options: ${tokens[0]}`);
                }
                tokens.shift();
                if (tokens[0] === "]") {
                    throw new Error("Unexpected ] in field option");
                }
                opts[name] = tokens.shift();
                break;
            }
            case "]":
                tokens.shift();
                return opts;

            default:
                throw new Error(`Unexpected token in field options: ${tokens[0]}`);
        }
    }

    throw new Error("No closing tag for field options");
};

const onfield = function (tokens) {
    const field = {
        name: null,
        type: null,
        tag: -1,
        map: null,
        oneof: null,
        required: false,
        repeated: false,
        options: {}
    };

    while (tokens.length) {
        switch (tokens[0]) {
            case "=":
                tokens.shift();
                field.tag = Number(tokens.shift());
                break;

            case "map":
                field.type = "map";
                field.map = { from: null, to: null };
                tokens.shift();
                if (tokens[0] !== "<") {
                    throw new Error(`Unexpected token in map type: ${tokens[0]}`);
                }
                tokens.shift();
                field.map.from = tokens.shift();
                if (tokens[0] !== ",") {
                    throw new Error(`Unexpected token in map type: ${tokens[0]}`);
                }
                tokens.shift();
                field.map.to = tokens.shift();
                if (tokens[0] !== ">") {
                    throw new Error(`Unexpected token in map type: ${tokens[0]}`);
                }
                tokens.shift();
                field.name = tokens.shift();
                break;

            case "repeated":
            case "required":
            case "optional": {
                const t = tokens.shift();
                field.required = t === "required";
                field.repeated = t === "repeated";
                field.type = tokens.shift();
                field.name = tokens.shift();
                break;
            }
            case "[":
                field.options = onfieldoptions(tokens);
                break;

            case ";":
                if (is.null(field.name)) {
                    throw new Error("Missing field name");
                }
                if (is.null(field.type)) {
                    throw new Error(`Missing type in message field: ${field.name}`);
                }
                if (field.tag === -1) {
                    throw new Error(`Missing tag number in message field: ${field.name}`);
                }
                tokens.shift();
                return field;

            default:
                throw new Error(`Unexpected token in message field: ${tokens[0]}`);
        }
    }

    throw new Error("No ; found for message field");
};

const onoptionMap = function (tokens) {
    const parse = function (value) {
        if (value === "true") {
            return true;
        }
        if (value === "false") {
            return false;
        }
        return value.replace(/^"+|"+$/gm, "");
    };

    const map = {};

    while (tokens.length) {
        if (tokens[0] === "}") {
            tokens.shift();
            return map;
        }

        const hasBracket = tokens[0] === "(";
        if (hasBracket) {
            tokens.shift();
        }

        const key = tokens.shift();
        if (hasBracket) {
            if (tokens[0] !== ")") {
                throw new Error(`Expected ) but found ${tokens[0]}`);
            }
            tokens.shift();
        }

        let value = null;

        switch (tokens[0]) {
            case ":":
                if (!is.undefined(map[key])) {
                    throw new Error(`Duplicate option map key ${key}`);
                }

                tokens.shift();

                value = parse(tokens.shift());

                if (value === "{") {
                    // option foo = {bar: baz}
                    value = onoptionMap(tokens);
                }

                map[key] = value;

                if (tokens[0] === ";") {
                    tokens.shift();
                }
                break;

            case "{":
                tokens.shift();
                value = onoptionMap(tokens);

                if (is.undefined(map[key])) {
                    map[key] = [];
                }
                if (!is.array(map[key])) {
                    throw new Error(`Duplicate option map key ${key}`);
                }

                map[key].push(value);
                break;

            default:
                throw new Error(`Unexpected token in option map: ${tokens[0]}`);
        }
    }

    throw new Error("No closing tag for option map");
};

const onoption = function (tokens) {
    let name = null;
    let value = null;

    const parse = function (value) {
        if (value === "true") {
            return true;
        }
        if (value === "false") {
            return false;
        }
        return value.replace(/^"+|"+$/gm, "");
    };

    while (tokens.length) {
        if (tokens[0] === ";") {
            tokens.shift();
            return { name, value };
        }
        switch (tokens[0]) {
            case "option": {
                tokens.shift();

                const hasBracket = tokens[0] === "(";
                if (hasBracket) {
                    tokens.shift();
                }

                name = tokens.shift();

                if (hasBracket) {
                    if (tokens[0] !== ")") {
                        throw new Error(`Expected ) but found ${tokens[0]}`);
                    }
                    tokens.shift();
                }

                if (tokens[0][0] === ".") {
                    name += tokens.shift();
                }

                break;
            }
            case "=":
                tokens.shift();
                if (is.null(name)) {
                    throw new Error(`Expected key for option with value: ${tokens[0]}`);
                }
                value = parse(tokens.shift());

                if (name === "optimize_for" && !/^(SPEED|CODE_SIZE|LITE_RUNTIME)$/.test(value)) {
                    throw new Error(`Unexpected value for option optimize_for: ${value}`);
                } else if (value === "{") {
                    // option foo = {bar: baz}
                    value = onoptionMap(tokens);
                }
                break;

            default:
                throw new Error(`Unexpected token in option: ${tokens[0]}`);
        }
    }
};

const onenumvalue = function (tokens) {
    if (tokens.length < 4) {
        throw new Error(`Invalid enum value: ${tokens.slice(0, 3).join(" ")}`);
    }
    if (tokens[1] !== "=") {
        throw new Error(`Expected = but found ${tokens[1]}`);
    }
    if (tokens[3] !== ";" && tokens[3] !== "[") {
        throw new Error(`Expected ; or [ but found ${tokens[1]}`);
    }

    const name = tokens.shift();
    tokens.shift();
    const val = {
        value: null,
        options: {}
    };
    val.value = Number(tokens.shift());
    if (tokens[0] === "[") {
        val.options = onfieldoptions(tokens);
    }
    tokens.shift(); // expecting the semicolon here

    return {
        name,
        val
    };
};

const onenum = function (tokens) {
    tokens.shift();
    let options = {};
    const e = {
        name: tokens.shift(),
        values: {},
        options: {}
    };

    if (tokens[0] !== "{") {
        throw new Error(`Expected { but found ${tokens[0]}`);
    }
    tokens.shift();

    while (tokens.length) {
        if (tokens[0] === "}") {
            tokens.shift();
            // there goes optional semicolon after the enclosing "}"
            if (tokens[0] === ";") {
                tokens.shift();
            }
            return e;
        }
        if (tokens[0] === "option") {
            options = onoption(tokens);
            e.options[options.name] = options.value;
            continue;
        }
        const val = onenumvalue(tokens);
        e.values[val.name] = val.val;
    }

    throw new Error("No closing tag for enum");
};

const onmessage = function (tokens) {
    tokens.shift();

    let lvl = 1;
    let body = [];
    const msg = {
        name: tokens.shift(),
        enums: [],
        extends: [],
        messages: [],
        fields: []
    };

    if (tokens[0] !== "{") {
        throw new Error(`Expected { but found ${tokens[0]}`);
    }
    tokens.shift();

    while (tokens.length) {
        if (tokens[0] === "{") {
            lvl++;
        } else if (tokens[0] === "}") {
            lvl--;
        }

        if (!lvl) {
            tokens.shift();
            body = onmessagebody(body);
            msg.enums = body.enums;
            msg.messages = body.messages;
            msg.fields = body.fields;
            msg.extends = body.extends;
            msg.extensions = body.extensions;
            return msg;
        }

        body.push(tokens.shift());
    }

    if (lvl) {
        throw new Error("No closing tag for message");
    }
};

const onmessagebody = function (tokens) {
    const body = {
        enums: [],
        messages: [],
        fields: [],
        extends: [],
        extensions: null
    };

    while (tokens.length) {
        switch (tokens[0]) {
            case "map":
            case "repeated":
            case "optional":
            case "required":
                body.fields.push(onfield(tokens));
                break;

            case "enum":
                body.enums.push(onenum(tokens));
                break;

            case "message":
                body.messages.push(onmessage(tokens));
                break;

            case "extensions":
                body.extensions = onextensions(tokens);
                break;

            case "oneof": {
                tokens.shift();
                const name = tokens.shift();
                if (tokens[0] !== "{") {
                    throw new Error(`Unexpected token in oneof: ${tokens[0]}`);
                }
                tokens.shift();
                while (tokens[0] !== "}") {
                    tokens.unshift("optional");
                    const field = onfield(tokens);
                    field.oneof = name;
                    body.fields.push(field);
                }
                tokens.shift();
                break;
            }
            case "extend":
                body.extends.push(onextend(tokens));
                break;

            case ";":
                tokens.shift();
                break;

            case "reserved":
            case "option":
                tokens.shift();
                while (tokens[0] !== ";") {
                    tokens.shift();
                }
                break;

            default:
                // proto3 does not require the use of optional/required, assumed as optional
                // "singular: a well-formed message can have zero or one of this field (but not more than one)."
                // https://developers.google.com/protocol-buffers/docs/proto3#specifying-field-rules
                tokens.unshift("optional");
                body.fields.push(onfield(tokens));
        }
    }

    return body;
};

const onextend = function (tokens) {
    const out = {
        name: tokens[1],
        message: onmessage(tokens)
    };
    return out;
};

const onextensions = function (tokens) {
    tokens.shift();
    const from = Number(tokens.shift());
    if (isNaN(from)) {
        throw new Error("Invalid from in extensions definition");
    }
    if (tokens.shift() !== "to") {
        throw new Error("Expected keyword 'to' in extensions definition");
    }
    let to = tokens.shift();
    if (to === "max") {
        to = MAX_RANGE;
    }
    to = Number(to);
    if (isNaN(to)) {
        throw new Error("Invalid to in extensions definition");
    }
    if (tokens.shift() !== ";") {
        throw new Error("Missing ; in extensions definition");
    }
    return { from, to };
};

const onpackagename = function (tokens) {
    tokens.shift();
    const name = tokens.shift();
    if (tokens[0] !== ";") {
        throw new Error(`Expected ; but found ${tokens[0]}`);
    }
    tokens.shift();
    return name;
};

const onsyntaxversion = function (tokens) {
    tokens.shift();

    if (tokens[0] !== "=") {
        throw new Error(`Expected = but found ${tokens[0]}`);
    }
    tokens.shift();

    let version = tokens.shift();
    switch (version) {
        case '"proto2"':
            version = 2;
            break;

        case '"proto3"':
            version = 3;
            break;

        default:
            throw new Error(`Expected protobuf syntax version but found ${version}`);
    }

    if (tokens[0] !== ";") {
        throw new Error(`Expected ; but found ${tokens[0]}`);
    }
    tokens.shift();

    return version;
};

const onrpc = function (tokens) {
    tokens.shift();

    const rpc = {
        name: tokens.shift(),
        input_type: null,
        output_type: null,
        client_streaming: false,
        server_streaming: false,
        options: {}
    };

    if (tokens[0] !== "(") {
        throw new Error(`Expected ( but found ${tokens[0]}`);
    }
    tokens.shift();

    if (tokens[0] === "stream") {
        tokens.shift();
        rpc.client_streaming = true;
    }

    rpc.input_type = tokens.shift();

    if (tokens[0] !== ")") {
        throw new Error(`Expected ) but found ${tokens[0]}`);
    }
    tokens.shift();

    if (tokens[0] !== "returns") {
        throw new Error(`Expected returns but found ${tokens[0]}`);
    }
    tokens.shift();

    if (tokens[0] !== "(") {
        throw new Error(`Expected ( but found ${tokens[0]}`);
    }
    tokens.shift();

    if (tokens[0] === "stream") {
        tokens.shift();
        rpc.server_streaming = true;
    }

    rpc.output_type = tokens.shift();

    if (tokens[0] !== ")") {
        throw new Error(`Expected ) but found ${tokens[0]}`);
    }
    tokens.shift();

    if (tokens[0] === ";") {
        tokens.shift();
        return rpc;
    }

    if (tokens[0] !== "{") {
        throw new Error(`Expected { but found ${tokens[0]}`);
    }
    tokens.shift();

    while (tokens.length) {
        if (tokens[0] === "}") {
            tokens.shift();
            // there goes optional semicolon after the enclosing "}"
            if (tokens[0] === ";") {
                tokens.shift();
            }
            return rpc;
        }

        if (tokens[0] === "option") {
            const opt = onoption(tokens);
            if (!is.undefined(rpc.options[opt.name])) {
                throw new Error(`Duplicate option ${opt.name}`);
            }
            rpc.options[opt.name] = opt.value;
        } else {
            throw new Error(`Unexpected token in rpc options: ${tokens[0]}`);
        }
    }

    throw new Error("No closing tag for rpc");
};

const onimport = function (tokens) {
    tokens.shift();
    const file = tokens.shift().replace(/^"+|"+$/gm, "");

    if (tokens[0] !== ";") {
        throw new Error(`Unexpected token: ${tokens[0]}. Expected ";"`);
    }

    tokens.shift();
    return file;
};

const onservice = function (tokens) {
    tokens.shift();

    const service = {
        name: tokens.shift(),
        methods: [],
        options: {}
    };

    if (tokens[0] !== "{") {
        throw new Error(`Expected { but found ${tokens[0]}`);
    }
    tokens.shift();

    while (tokens.length) {
        if (tokens[0] === "}") {
            tokens.shift();
            // there goes optional semicolon after the enclosing "}"
            if (tokens[0] === ";") {
                tokens.shift();
            }
            return service;
        }

        switch (tokens[0]) {
            case "option": {
                const opt = onoption(tokens);
                if (!is.undefined(service.options[opt.name])) {
                    throw new Error(`Duplicate option ${opt.name}`);
                }
                service.options[opt.name] = opt.value;
                break;
            }
            case "rpc":
                service.methods.push(onrpc(tokens));
                break;
            default:
                throw new Error(`Unexpected token in service: ${tokens[0]}`);
        }
    }

    throw new Error("No closing tag for service");
};

export default function (buf) {
    let tokens = tokenize(buf.toString());
    // check for isolated strings in tokens by looking for opening quote
    for (let i = 0; i < tokens.length; i++) {
        if (/^("|')([^'"]*)$/.test(tokens[i])) {
            let j;
            if (tokens[i].length === 1) {
                j = i + 1;
            } else {
                j = i;
            }
            // look ahead for the closing quote and collapse all
            // in-between tokens into a single token
            for (j; j < tokens.length; j++) {
                if (/^([^'"]*)("|')$/.test(tokens[j])) {
                    tokens = tokens.slice(0, i).concat(tokens.slice(i, j + 1).join("")).concat(tokens.slice(j + 1));
                    break;
                }
            }
        }
    }
    const schema = {
        syntax: 3,
        package: null,
        imports: [],
        enums: [],
        messages: [],
        options: {},
        extends: []
    };

    let firstline = true;

    while (tokens.length) {
        switch (tokens[0]) {
            case "package":
                schema.package = onpackagename(tokens);
                break;

            case "syntax":
                if (!firstline) {
                    throw new Error("Protobuf syntax version should be first thing in file");
                }
                schema.syntax = onsyntaxversion(tokens);
                break;

            case "message":
                schema.messages.push(onmessage(tokens));
                break;

            case "enum":
                schema.enums.push(onenum(tokens));
                break;

            case "option": {
                const opt = onoption(tokens);
                if (schema.options[opt.name]) {
                    throw new Error(`Duplicate option ${opt.name}`);
                }
                schema.options[opt.name] = opt.value;
                break;
            }
            case "import":
                schema.imports.push(onimport(tokens));
                break;

            case "extend":
                schema.extends.push(onextend(tokens));
                break;

            case "service":
                if (!schema.services) {
                    schema.services = [];
                }
                schema.services.push(onservice(tokens));
                break;

            default:
                throw new Error(`Unexpected token: ${tokens[0]}`);
        }
        firstline = false;
    }

    // now iterate over messages and propagate extends
    schema.extends.forEach((ext) => {
        schema.messages.forEach((msg) => {
            if (msg.name === ext.name) {
                ext.message.fields.forEach((field) => {
                    if (!msg.extensions || field.tag < msg.extensions.from || field.tag > msg.extensions.to) {
                        throw new Error(`${msg.name} does not declare ${field.tag} as an extension number`);
                    }
                    msg.fields.push(field);
                });
            }
        });
    });

    schema.messages.forEach((msg) => {
        msg.fields.forEach((field) => {
            let fieldSplit;
            let messageName;
            let nestedEnumName;
            let message;

            const enumNameIsFieldType = (en) => en.name === field.type;
            const enumNameIsNestedEnumName = (en) => en.name === nestedEnumName;

            if (field.options && field.options.packed === "true") {
                if (PACKABLE_TYPES.indexOf(field.type) === -1) {
                    // let's see if it's an enum
                    if (field.type.indexOf(".") === -1) {
                        if (msg.enums && msg.enums.some(enumNameIsFieldType)) {
                            return;
                        }
                    } else {
                        fieldSplit = field.type.split(".");
                        if (fieldSplit.length > 2) {
                            throw new Error("what is this?");
                        }

                        messageName = fieldSplit[0];
                        nestedEnumName = fieldSplit[1];

                        schema.messages.some((msg) => {
                            if (msg.name === messageName) {
                                message = msg;
                                return msg;
                            }
                        });

                        if (message && message.enums && message.enums.some(enumNameIsNestedEnumName)) {
                            return;
                        }
                    }

                    throw new Error(
                        `Fields of type ${field.type} cannot be declared [packed=true]. ` +
                        "Only repeated fields of primitive numeric types (types which use " +
                        "the varint, 32-bit, or 64-bit wire types) can be declared \"packed\". " +
                        "See https://developers.google.com/protocol-buffers/docs/encoding#optional"
                    );
                }
            }
        });
    });

    return schema;
};
