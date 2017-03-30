const { std: { util }, data: { yaml } } = adone;


function Tag1(parameters) {
    this.x = parameters.x;
    this.y = parameters.y || 0;
    this.z = parameters.z || 0;
}


function Tag2() {
    Tag1.apply(this, arguments);
}
util.inherits(Tag2, Tag1);


function Tag3() {
    Tag2.apply(this, arguments);
}
util.inherits(Tag3, Tag2);


function Foo(parameters) {
    this.myParameter = parameters.myParameter;
    this.myAnotherParameter = parameters.myAnotherParameter;
}


const TEST_SCHEMA = yaml.schema.create([
    // NOTE: Type order matters!
    // Inherited classes must precede their parents because the dumper
    // doesn't inspect class inheritance and just picks first suitable
    // class from this array.
    new yaml.type.Type("!tag3", {
        kind: "mapping",
        resolve(data) {
            if (data === null) {
                return false;
            }
            if (!Object.prototype.hasOwnProperty.call(data, "=") &&
                !Object.prototype.hasOwnProperty.call(data, "x")) {
                return false;
            }
            if (!Object.keys(data).every((k) => {
                return k === "=" || k === "x" || k === "y" || k === "z";
            })) {
                return false;
            }
            return true;
        },
        construct(data) {
            return new Tag3({ x: (data["="] || data.x), y: data.y, z: data.z });
        },
        instanceOf: Tag3,
        represent(object) {
            return { "=": object.x, y: object.y, z: object.z };
        }
    }),
    new yaml.type.Type("!tag2", {
        kind: "scalar",
        construct(data) {
            return new Tag2({ x: (typeof data === "number") ? data : parseInt(data, 10) });
        },
        instanceOf: Tag2,
        represent(object) {
            return String(object.x);
        }
    }),
    new yaml.type.Type("!tag1", {
        kind: "mapping",
        resolve(data) {
            if (data === null) {
                return false;
            }
            if (!Object.prototype.hasOwnProperty.call(data, "x")) {
                return false;
            }
            if (!Object.keys(data).every((k) => {
                return k === "x" || k === "y" || k === "z";
            })) {
                return false;
            }
            return true;
        },
        construct(data) {
            return new Tag1({ x: data.x, y: data.y, z: data.z });
        },
        instanceOf: Tag1
    }),
    new yaml.type.Type("!foo", {
        kind: "mapping",
        resolve(data) {
            if (data === null) {
                return false;
            }
            if (!Object.keys(data).every((k) => {
                return k === "my-parameter" || k === "my-another-parameter";
            })) {
                return false;
            }
            return true;
        },
        construct(data) {
            return new Foo({
                myParameter: data["my-parameter"],
                myAnotherParameter: data["my-another-parameter"]
            });
        },
        instanceOf: Foo,
        represent(object) {
            return {
                "my-parameter": object.myParameter,
                "my-another-parameter": object.myAnotherParameter
            };
        }
    })
]);


module.exports.Tag1 = Tag1;
module.exports.Tag2 = Tag2;
module.exports.Tag3 = Tag3;
module.exports.Foo = Foo;
module.exports.TEST_SCHEMA = TEST_SCHEMA;
