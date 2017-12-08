// Property-based testing representations of various things in AMQP

const { is } = adone;
const C = require("claire");
const forAll = C.forAll;
const arb = C.data;
const transform = C.transform;
const repeat = C.repeat;
const label = C.label;
const sequence = C.sequence;
const asGenerator = C.asGenerator;
const sized = C.sized;
const recursive = C.recursive;
const choice = C.choice;
const Undefined = C.Undefined;

// Stub these out so we can use outside tests
// if (!suite) var suite = function() {}
// if (!test) var test = function() {}

// These aren't exported in claire/index. so I could have to reproduce
// them I guess.
const choose = (a, b) => {
    return Math.random() * (b - a) + a;
};

const chooseInt = (a, b) => {
    return Math.floor(choose(a, b));
};

export const rangeInt = (name, a, b) => {
    return label(name,
        asGenerator((_) => {
            return chooseInt(a, b);
        }));
};

const toFloat32 = (i) => {
    const b = Buffer.alloc(4);
    b.writeFloatBE(i, 0);
    return b.readFloatBE(0);
};

const floatChooser = (maxExp) => {
    return function () {
        let n = Number.NaN;
        while (isNaN(n)) {
            const mantissa = Math.random() * 2 - 1;
            const exponent = chooseInt(0, maxExp);
            n = Math.pow(mantissa, exponent);
        }
        return n;
    };
};

const explicitType = (t, underlying) => {
    return label(t, transform((n) => {
        return { "!": t, value: n };
    }, underlying));
};

// FIXME null, byte array, others?

export const Octet = rangeInt("octet", 0, 255);
export const ShortStr = label("shortstr",
    transform((s) => {
        return s.substr(0, 255);
    }, arb.Str));

export const LongStr = label("longstr",
    transform(
        (bytes) => {
            return Buffer.from(bytes);
        },
        repeat(Octet)));

export const UShort = rangeInt("short-uint", 0, 0xffff);
export const ULong = rangeInt("long-uint", 0, 0xffffffff);
export const ULongLong = rangeInt("longlong-uint", 0, 0xffffffffffffffff);
export const Short = rangeInt("short-int", -0x8000, 0x7fff);
export const Long = rangeInt("long-int", -0x80000000, 0x7fffffff);
export const LongLong = rangeInt("longlong-int", -0x8000000000000000,
    0x7fffffffffffffff);
export const Bit = label("bit", arb.Bool);
export const Double = label("double", asGenerator(floatChooser(308)));
export const Float = label("float", transform(toFloat32, floatChooser(38)));
export const Timestamp = label("timestamp", transform(
    (n) => {
        return { "!": "timestamp", value: n };
    }, ULongLong));
export const Decimal = label("decimal", transform(
    (args) => {
        return { "!": "decimal", value: { places: args[1], digits: args[0] } };
    }, sequence(arb.UInt, Octet)));

// Signed 8 bit int
const Byte = rangeInt("byte", -128, 127);

// Explicitly typed values
const ExByte = explicitType("byte", Byte);
const ExInt8 = explicitType("int8", Byte);
const ExShort = explicitType("short", Short);
const ExInt16 = explicitType("int16", Short);
const ExInt = explicitType("int", Long);
const ExInt32 = explicitType("int32", Long);
const ExLong = explicitType("long", LongLong);
const ExInt64 = explicitType("int64", LongLong);

export const FieldArray = label("field-array", recursive(() => {
    return arb.Array(
        arb.Null,
        LongStr, ShortStr,
        Octet, UShort, ULong, ULongLong,
        Byte, Short, Long, LongLong,
        ExByte, ExInt8, ExShort, ExInt16,
        ExInt, ExInt32, ExLong, ExInt64,
        Bit, Float, Double, FieldTable, FieldArray);
}));

export const FieldTable = label("table", recursive(() => {
    return sized(() => {
        return 5;
    },
    arb.Object(
        arb.Null,
        LongStr, ShortStr, Octet,
        UShort, ULong, ULongLong,
        Byte, Short, Long, LongLong,
        ExByte, ExInt8, ExShort, ExInt16,
        ExInt, ExInt32, ExLong, ExInt64,
        Bit, Float, Double, FieldArray, FieldTable));
}));

// Internal tests of our properties
const domainProps = [
    [Octet, function (n) {
        return n >= 0 && n < 256;
    }],
    [ShortStr, function (s) {
        return is.string(s) && s.length < 256;
    }],
    [LongStr, function (s) {
        return is.buffer(s);
    }],
    [UShort, function (n) {
        return n >= 0 && n <= 0xffff;
    }],
    [ULong, function (n) {
        return n >= 0 && n <= 0xffffffff;
    }],
    [ULongLong, function (n) {
        return n >= 0 && n <= 0xffffffffffffffff;
    }],
    [Short, function (n) {
        return n >= -0x8000 && n <= 0x8000;
    }],
    [Long, function (n) {
        return n >= -0x80000000 && n < 0x80000000;
    }],
    [LongLong, function (n) {
        return n >= -0x8000000000000000 && n < 0x8000000000000000;
    }],
    [Bit, function (b) {
        return is.boolean(b);
    }],
    [Double, function (f) {
        return !isNaN(f) && isFinite(f);
    }],
    [Float, function (f) {
        return !isNaN(f) && isFinite(f) && (Math.log(Math.abs(f)) * Math.LOG10E) < 309;
    }],
    [Decimal, function (d) {
        return d["!"] === "decimal" &&
      d.value.places <= 255 &&
      d.value.digits <= 0xffffffff;
    }],
    [Timestamp, function (t) {
        return t["!"] === "timestamp";
    }],
    [FieldTable, function (t) {
        return typeof t === "object";
    }],
    [FieldArray, function (a) {
        return is.array(a);
    }]
];

describe("net", "amqp", "data", "Domains", () => {
    domainProps.forEach((p) => {
        it(`${p[0]} domain`,
            forAll(p[0]).satisfy(p[1]).asTest({ times: 500 }));
    });
});

// For methods and properties (as opposed to field table values) it's
// easier just to accept and produce numbers for timestamps.
const ArgTimestamp = label("timestamp", ULongLong);

// These are the domains used in method arguments
const ARG_TYPES = {
    octet: Octet,
    shortstr: ShortStr,
    longstr: LongStr,
    short: UShort,
    long: ULong,
    longlong: ULongLong,
    bit: Bit,
    table: FieldTable,
    timestamp: ArgTimestamp
};

const argtype = (thing) => {
    if (is.undefined(thing.default)) {
        return ARG_TYPES[thing.type];
    }

    return choice(ARG_TYPES[thing.type], Undefined);

};

const zipObject = (vals, names) => {
    const obj = {};
    vals.forEach((v, i) => {
        obj[names[i]] = v;
    });
    return obj;
};

const name = (arg) => {
    return arg.name;
};

const {
    defs
} = adone.private(adone.net.amqp);

const method = (info) => {
    const domain = sequence.apply(null, info.args.map(argtype));
    const names = info.args.map(name);
    return label(info.name, transform((fieldVals) => {
        return { id: info.id,
            fields: zipObject(fieldVals, names) };
    }, domain));
};

const properties = (info) => {
    const types = info.args.map(argtype);
    types.unshift(ULongLong); // size
    const domain = sequence.apply(null, types);
    const names = info.args.map(name);
    return label(info.name, transform((fieldVals) => {
        return { id: info.id,
            size: fieldVals[0],
            fields: zipObject(fieldVals.slice(1), names) };
    }, domain));
};

export const methods = [];
const propertieses = [];

for (const k in defs) {
    if (k.substr(0, 10) === "methodInfo") {
        methods.push(method(defs[k]));
        methods[defs[k].name] = method(defs[k]);
    } else if (k.substr(0, 14) === "propertiesInfo") {
        propertieses.push(properties(defs[k]));
        propertieses[defs[k].name] = properties(defs[k]);
    }
}

export { propertieses as properties };
