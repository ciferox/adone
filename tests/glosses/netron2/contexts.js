const {
    is,
    netron2: { DContext, DPublic }
} = adone;

@DContext()
export class Simple {
    @DPublic()
    simple() {
        return 888;
    }
}

@DContext()
export class A {
    @DPublic()
    methodA() {
        return this.propA;
    }

    @DPublic()
    propA = "aaa";
}

@DContext({
    description: "class b extends a"
})
export class B extends A {
    constructor() {
        super();
        this.val = "bbb";
    }
    @DPublic()
    methodB() {
        return this.val;
    }

    @DPublic()
    echoB(...args) {
        return args;
    }

    @DPublic()
    syncErrorB() {
        throw new adone.exception.InvalidArgument("Invalid argument");
    }

    @DPublic()
    asyncErrorB() {
        return new Promise(async (resolve, reject) => {
            await adone.promise.delay(1);
            reject(new adone.exception.InvalidArgument("Invalid argument"));
        });
    }

    @DPublic()
    asyncB() {
        return new Promise(async (resolve) => {
            await adone.promise.delay(1);
            resolve("ok");
        });
    }

    @DPublic()
    propB = 2;

    @DPublic({
        readonly: true
    })
    rpropB = 777;
}


@DContext()
export class C extends B {
    @DPublic()
    methodC() {
        return "ccc";
    }

    @DPublic()
    propC = 3;
}

const set1 = new Set();
set1.add("adone");
set1.add(6);
set1.add(true);

const set2 = new Set();
set2.add(new Date());
set2.add(54.55);
set2.add([1, 2, 3]);
set2.add({ ok: false });

const map1 = new Map();
map1.set("string", "adone");
map1.set("number", 79879);
map1.set("boolean", false);

const map2 = new Map();
map2.set("string", "_099_");
map2.set("number", 65.33);
map2.set("boolean", true);
map2.set("date", new Date());

export const commonTypes = [
    {
        name: "string",
        value: "adone",
        otherValue: "peer"
    },
    {
        name: "integer",
        value: 7887,
        otherValue: 8998
    },
    {
        name: "double",
        value: 78.87,
        otherValue: 982.242
    },
    {
        name: "date",
        value: new Date(),
        otherValue: new Date()
    },
    {
        name: "boolean",
        value: true,
        otherValue: false
    },
    {
        name: "null",
        value: null,
        otherValue: undefined
    },
    {
        name: "undefined",
        value: undefined,
        otherValue: null
    },
    // {
    //     name: "regexp",
    //     value: /adone/
    // },
    {
        name: "array1",
        value: [1, 2, 3],
        otherValue: [33, 22, 11, 44]
    },
    {
        name: "array2",
        value: ["3", "2", "1"],
        otherValue: ["one", "two", "three"]
    },
    {
        name: "array3",
        value: [true, 1, "adone", new Date()],
        otherValue: [false, "adone", new Date(), 213.123]
    },
    {
        name: "object1",
        value: {
            a: 1
        },
        otherValue: {
            1: "A"
        }
    },
    {
        name: "object2",
        value: {
            a: "adone",
            b: {
                c: [1, {
                    // e: /adone/,
                    d: 98.99
                }, new Date()]
            }
        },
        otherValue: {
            b: "adone",
            c: {
                a: [1, {
                    pi: 3.14159
                }, new Date(), new Date()]
            }
        }
    },
    {
        name: "long",
        value: adone.math.Long.ONE,
        otherValue: adone.math.Long.NEG_ONE
    },
    {
        name: "Set",
        value: set1,
        otherValue: set2
    },
    {
        name: "Map",
        value: map1,
        otherValue: map2
    }
];

@DContext()
export class CommonTypes { }

for (const ct of commonTypes) {
    CommonTypes.prototype[`_${ct.name}`] = ct.value;
    adone.meta.reflect.defineMetadata(adone.netron2.PUBLIC_ANNOTATION, {}, CommonTypes.prototype, `_${ct.name}`);

    CommonTypes.prototype[ct.name] = function () {
        return this[`_${ct.name}`];
    };
    adone.meta.reflect.defineMetadata(adone.netron2.PUBLIC_ANNOTATION, {}, CommonTypes.prototype, ct.name);

    CommonTypes.prototype[`set_${ct.name}`] = function (val) {
        this[`_${ct.name}`] = val;
        return val;
    };
    adone.meta.reflect.defineMetadata(adone.netron2.PUBLIC_ANNOTATION, {}, CommonTypes.prototype, `set_${ct.name}`);
}

export const DocumentTypes = {
    number: 1,
    string: 2,
    boolean: 3,
    object: 4,
    array: 5,
    map: 6,
    set: 7,
    date: 8
};

@DContext({
    description: "Object document"
})
export class Document {
    @DPublic({
        readonly: true
    })
    data = undefined;

    @DPublic({
        readonly: true
    })
    type = undefined;

    constructor(data, type) {
        this.data = data;
        this.type = type;
    }

    @DPublic({
        description: "Returns string representation of document",
        type: String,
        args: [Object]
    })
    inspect(options) {
        return adone.std.util.inspect(this.data, options);
    }
}

@DContext({
    description: "Simple object storage"
})
export class ObjectStorage {
    @DPublic({
        decsription: "Name of the storage"
    })
    name = undefined;

    _totalSize = undefined;

    constructor(name, size) {
        this.name = name;
        this._totalSize = size;
    }

    @DPublic({
        description: "Returns total size of storage",
        type: Number
    })
    getCapacity() {
        return this._totalSize;
    }

    @DPublic({
        description: "Sets new size of storage",
        type: Number,
        args: [Number]
    })
    setCapacity(size) {
        this._totalSize = size;
    }

    @DPublic({
        description: "Returns supported document types",
        type: Object
    })
    supportedDocTypes() {
        return DocumentTypes;
    }

    @DPublic({
        type: Number
    })
    getSize() {
        return this._docs.size;
    }

    @DPublic({
        description: "Adds document. Returns 'true' if document added to storage, otherwise 'false'",
        type: Boolean,
        args: [String, Document]
    })
    addDocument(name, doc) {
        if (this._docs.size >= this._totalSize || this._docs.has(name)) {
            return false;
        }
        this._docs.set(name, doc);

        return true;
    }

    @DPublic({
        description: "Returns document by name",
        type: Document,
        args: [String]
    })
    getDocument(name) {
        return this._docs.get(name) || null;
    }

    @DPublic()
    createDocument(data, type) {
        return new Document(data, type);
    }

    _docs = new Map();
}

export const BodyStatuses = {
    Dead: 0,
    Alive: 1
};

@DContext()
export class Soul {
    constructor(name) {
        this.name = name;
    }

    @DPublic()
    eatVitality(percentage) {
        this.vitality -= percentage;
        if (this.vitality <= 0) {
            this.bodyStatus = BodyStatuses.Dead;
        }
    }

    @DPublic()
    doEvil(otherSoul, percentage) {
        return otherSoul.eatVitality(percentage);
    }

    @DPublic()
    vitality = 100;

    @DPublic()
    bodyStatus = BodyStatuses.Alive;
}

@DContext()
export class Devil {
    @DPublic()
    sellSoul(manName, iSoul) {
        if (this.souls.has(manName)) {
            return false;
        }
        this.souls.set(manName, iSoul);
        return true;
    }

    @DPublic()
    possess(manName) {
        const iSoul = this.souls.get(manName);
        if (!is.undefined(iSoul)) {
            this.possessedSoul = iSoul;
        }
    }

    @DPublic()
    takeVitality(percentage) {
        if (!is.undefined(this.possessedSoul)) {
            return this.possessedSoul.eatVitality(percentage);
        }
    }

    @DPublic()
    doEvil(manName, percentage) {
        if (!is.undefined(this.possessedSoul)) {
            return this.possessedSoul.doEvil(this.souls.get(manName), percentage);
        }
    }

    @DPublic({
        type: Map
    })
    souls = new Map();

    @DPublic()
    possessedSoul = null;
}

@DContext()
export class Weak {
    @DPublic()
    doSomething() {
        return 888;
    }
}

@DContext()
export class Strong {
    constructor(netron) {
        this.netron = netron;
        this.weak = new Weak();
    }

    @DPublic()
    getWeak() {
        return this.weak;
    }

    @DPublic()
    releaseWeak() {
        this.netron.releaseContext(this.weak);
        this.weak = null;
    }
}

let depthCounter;

@DContext()
export class CounterKeeper {
    constructor(keeper = null) {
        this.keeper = keeper;
    }

    @DPublic()
    async getCounter() {
        if (this.keeper) {
            depthCounter++;
            return (await this.keeper.getCounter()) + 1;
        }
        return 1;

    }

    @DPublic()
    async getNextKeeper(keeper) {
        return new CounterKeeper(keeper);
    }

    static getValue() {
        return depthCounter;
    }

    static setValue(val) {
        depthCounter = val;
    }
}

@DContext()
export class NumField {
    constructor(val) {
        this._val = val;
    }

    @DPublic()
    getValue() {
        return this._val;
    }
}

@DContext()
export class NumSet {
    @DPublic()
    getFields(start, end) {
        const defs = new adone.netron2.Definitions();
        for (let i = start; i < end; i++) {
            defs.push(new NumField(i));
        }
        return defs;
    }

    @DPublic()
    setFields(fields) {
        this._fields = fields;
    }
}

@DContext()
export class StdErrs {
    @DPublic()
    throwError() {
        throw new Error("description");
    }

    @DPublic()
    throwEvalError() {
        throw new EvalError("description");
    }

    @DPublic()
    throwRangeError() {
        throw new RangeError("description");
    }

    @DPublic()
    throwReferenceError() {
        throw new ReferenceError("description");
    }

    @DPublic()
    throwSyntaxError() {
        throw new SyntaxError("description");
    }

    @DPublic()
    throwTypeError() {
        throw new TypeError("description");
    }

    @DPublic()
    throwURIError() {
        throw new URIError("description");
    }
}


@DContext()
export class AdoneErrs { }

export const adoneErrors = adone.exception.adoneExceptions;
export const netronErrors = [];
for (const AdoneError of adoneErrors) {
    if (adone.exception.exceptionIdMap[AdoneError] < 1000) {
        const fnName = `throw${AdoneError.name}`;
        if (AdoneError.name.startsWith("Netron")) {
            netronErrors.push(AdoneError.name);
        } else {
            if (AdoneError.name === "AggregateException") {
                AdoneErrs.prototype[fnName] = function () {
                    throw new AdoneError([new adone.exception.Exception("a"), new adone.exception.Runtime("b")]);
                };
            } else {
                AdoneErrs.prototype[fnName] = function () {
                    throw new AdoneError("description");
                };
            }
            adone.meta.reflect.defineMetadata(adone.netron2.PUBLIC_ANNOTATION, {}, AdoneErrs.prototype, fnName);
        }
    }
}


class MyError extends Error { }

@DContext()
export class NonStdErr {
    @DPublic()
    throw() {
        throw new MyError("Hello World!");
    }
}

process.binding("natives").native_module = "";
const nm = nodeRequire("native_module");
export const nodeErrors = adone.util.omit(nm.require("internal/errors"), ["message", "E"]);

@DContext()
export class NodeErrs {
}

for (const [name, Exc] of Object.entries(nodeErrors)) {
    const fnName = `throw${name}`;
    NodeErrs.prototype[fnName] = function () {
        if (Exc.name === "AssertionError") {
            throw new Exc({
                message: "Hello World!"
            });
        }
        throw new Exc("Hello World!");
    };
    adone.meta.reflect.defineMetadata(adone.netron2.PUBLIC_ANNOTATION, {}, NodeErrs.prototype, fnName);
    
}
