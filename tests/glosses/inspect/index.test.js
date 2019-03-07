const {
    assertion,
    inspect
} = adone;
assertion.use(assertion.extension.dirty);

describe("inspect", () => {
    it("should inspect a variable with default options accordingly", () => {

        const MyClass = function MyClass() {
            this.variable = 1;
        };

        MyClass.prototype.report = function report() {
            console.log("Variable value:", this.variable);
        };
        MyClass.staticFunc = function staticFunc() {
            console.log("Static function.");
        };

        const sparseArray = [];
        sparseArray[3] = "three";
        sparseArray[10] = "ten";
        sparseArray[20] = "twenty";
        sparseArray.customProperty = "customProperty";

        const object = {
            a: "A",
            b: 2,
            str: "Woot\nWoot\rWoot\tWoot",
            sub: {
                u: undefined,
                n: null,
                t: true,
                f: false
            },
            emptyString: "",
            emptyObject: {},
            list: ["one", "two", "three"],
            emptyList: [],
            sparseArray,
            hello: function hello() {
                console.log("Hello!");
            },
            anonymous() {
                console.log("anonymous...");
            },
            class: MyClass,
            instance: new MyClass(),
            buf: Buffer.from("This is a buffer!")
        };

        object.sub.circular = object;

        Object.defineProperties(object, {
            c: { value: "3" },
            d: {
                get() {
                    throw new Error("Should not be called by the test");
                },
                set(value) { }
            }
        });

        //console.log( '>>>>>' , string.escape.control( string.inspect( object ) ) ) ;
        //console.log( string.inspect( { style: 'color' } , object ) ) ;
        const actual = inspect(object, { native: true });
        const expected = '<Object> <object> {\n    a: "A" <string>(1)\n    b: 2 <number>\n    str: "Woot\\nWoot\\rWoot\\tWoot" <string>(19)\n    sub: <Object> <object> {\n        u: undefined\n        n: null\n        t: true\n        f: false\n        circular: <Object> <object> [circular]\n    }\n    emptyString: "" <string>(0)\n    emptyObject: <Object> <object> {}\n    list: <Array>(3) <object> {\n        [0] "one" <string>(3)\n        [1] "two" <string>(3)\n        [2] "three" <string>(5)\n        length: 3 <number> <-conf -enum>\n    }\n    emptyList: <Array>(0) <object> {\n        length: 0 <number> <-conf -enum>\n    }\n    sparseArray: <Array>(21) <object> {\n        [3] "three" <string>(5)\n        [10] "ten" <string>(3)\n        [20] "twenty" <string>(6)\n        length: 21 <number> <-conf -enum>\n        customProperty: "customProperty" <string>(14)\n    }\n    hello: <Function> hello(0) <function>\n    anonymous: <Function> anonymous(0) <function>\n    class: <Function> MyClass(0) <function>\n    instance: <MyClass> <object> {\n        variable: 1 <number>\n    }\n    buf: <Buffer 54 68 69 73 20 69 73 20 61 20 62 75 66 66 65 72 21> <Buffer>(17)\n    c: "3" <string>(1) <-conf -enum -w>\n    d: <getter/setter> {\n        get: <Function> get(0) <function>\n        set: <Function> set(1) <function>\n    }\n}\n';
        //console.log( '\n' + expected + '\n\n' + actual + '\n\n' ) ;
        expect(actual).to.be.equal(expected);
        //console.log( string.inspect( { style: 'color' } , object ) ) ;
    });

    it("should pass the Array circular references bug", () => {
        const array = [[1]];
        expect(inspect(array)).to.be.equal("<Array>(1) <object> {\n    [0] <Array>(1) <object> {\n        [0] 1 <number>\n        length: 1 <number> <-conf -enum>\n    }\n    length: 1 <number> <-conf -enum>\n}\n");
    });

    it("should inspect object with no constructor", () => {
        expect(inspect(Object.assign(Object.create(null), { a: 1, b: 2 }))).to.be.equal("<(no constructor)> <object> {\n    a: 1 <number>\n    b: 2 <number>\n}\n");
    });

    it("should use custom inspector whe the option 'useInspect'is set", () => {
        function Obj() {
            this.name = "bob";
        }

        Obj.prototype.inspect = function () {
            return `<${this.name}>`;
        };

        expect(inspect(new Obj(), { useInspect: true })).to.be.equal("<Obj> <object> => <bob>\n");
    });
}); 
