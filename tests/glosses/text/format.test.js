const { format } = adone;
const { formatMethod } = format;

describe("format", () => {
    it("should perform basic examples", () => {
        expect(format("Hello world")).to.be.equal("Hello world");
        expect(format("Hello %s", "world")).to.be.equal("Hello world");
        expect(format("Hello %s %s, how are you?", "Joe", "Doe")).to.be.equal("Hello Joe Doe, how are you?");
        expect(format("I have %i cookies.", 3)).to.be.equal("I have 3 cookies.");
        expect(format("This company regains %d%% of market share.", 36)).to.be.equal("This company regains 36% of market share.");
        expect(format("11/8=%f", 11 / 8)).to.be.equal("11/8=1.375");
        expect(format("Binary %b %b", 11, 123)).to.be.equal("Binary 1011 1111011");
        expect(format("Octal %o %o", 11, 123)).to.be.equal("Octal 13 173");
        expect(format("Hexa %h %x %x", 11, 11, 123)).to.be.equal("Hexa b 0b 7b");
        expect(format("JSON %J", { hello: "world", here: "is", my: { wonderful: "object" } })).to.be.equal('JSON {"hello":"world","here":"is","my":{"wonderful":"object"}}');
        expect(format("Inspect %I", { hello: "world", here: "is", my: { wonderful: "object" } })).to.be.equal('Inspect <Object> <Object> {\n    hello: "world" <string>(5)\n    here: "is" <string>(2)\n    my: <Object> <Object> {\n        wonderful: "object" <string>(6)\n    }\n}');
        // expect( format( 'Inspect %E' , new Error( 'Some error' ) ) ).to.be.equal( '' ) ;
    });

    it("%u should format unsigned integer", () => {
        expect(format("%u", 123)).to.be.equal("123");
        expect(format("%u", 0)).to.be.equal("0");
        expect(format("%u", -123)).to.be.equal("0");
        expect(format("%u")).to.be.equal("0");
    });

    it("%U should format *positive* unsigned integer", () => {
        expect(format("%U", 123)).to.be.equal("123");
        expect(format("%U", 0)).to.be.equal("1");
        expect(format("%U", -123)).to.be.equal("1");
        expect(format("%U")).to.be.equal("1");
    });

    it("should perform well the argument's index feature", () => {
        expect(format("%s%s%s", "A", "B", "C")).to.be.equal("ABC");
        expect(format("%+1s%-1s%s", "A", "B", "C")).to.be.equal("BAC");
        expect(format("%3s%s", "A", "B", "C")).to.be.equal("CBC");
    });

    it("should perform well the mode arguments feature", () => {
        expect(format("%[f0]f", 1 / 3)).to.be.equal("0");
        expect(format("%[f1]f", 1 / 3)).to.be.equal("0.3");
        expect(format("%[f2]f", 1 / 3)).to.be.equal("0.33");

        expect(format("%[f0]f", 0.1)).to.be.equal("0");
        expect(format("%[f1]f", 0.1)).to.be.equal("0.1");
        expect(format("%[f2]f", 0.1)).to.be.equal("0.10");

		/*	p is not finished yet
		expect( format( '%[p1]f' , 123 ) ).to.be.equal( '10000' ) ;
		expect( format( '%[p2]f' , 123 ) ).to.be.equal( '12000' ) ;
		
		expect( format( '%[p1]f' , 1/3 ) ).to.be.equal( '0.3' ) ;
		expect( format( '%[p2]f' , 1/3 ) ).to.be.equal( '0.33' ) ;
		
		expect( format( '%[p1]f' , 0.1 ) ).to.be.equal( '0.1' ) ;
		expect( format( '%[p2]f' , 0.1 ) ).to.be.equal( '0.10' ) ;
		*/
    });

    it("format.count() should count the number of arguments found", () => {
        expect(format.count("blah blih blah")).to.be.equal(0);
        expect(format.count("blah blih %% blah")).to.be.equal(0);
        expect(format.count("%i %s")).to.be.equal(2);
        expect(format.count("%1i %1s")).to.be.equal(1);
        expect(format.count("%5i")).to.be.equal(5);
        expect(format.count("%[unexistant]F")).to.be.equal(0);
        expect(format.count("%[unexistant:%a%a]F")).to.be.equal(2);
    });

    it("format.hasFormatting() should return true if the string has formatting and thus need to be interpreted, or false otherwise", () => {

        expect(format.hasFormatting("blah blih blah")).to.be.equal(false);
        expect(format.hasFormatting("blah blih %% blah")).to.be.equal(true);
        expect(format.hasFormatting("%i %s")).to.be.equal(true);
        expect(format.hasFormatting("%[unexistant]F")).to.be.equal(true);
        expect(format.hasFormatting("%[unexistant:%a%a]F")).to.be.equal(true);
    });

    it("when using a filter object as the *this* context, the %[functionName]F format should use a custom function to format the input", () => {

        const formatter = {
            format: formatMethod,
            fn: {
                fixed() {
                    return "f";
                },
                double(str) {
                    return String(str) + str;
                },
                fxy(a, b) {
                    return `${a * a + b}`;
                }
            }
        };

        expect(formatter.format("%[fixed]F")).to.be.equal("f");
        expect(formatter.format("%[fixed]F%s%s%s", "A", "B", "C")).to.be.equal("fABC");
        expect(formatter.format("%s%[fxy:%a%a]F", "f(x,y)=", 5, 3)).to.be.equal("f(x,y)=28");
        expect(formatter.format("%s%[fxy:%+1a%-1a]F", "f(x,y)=", 5, 3)).to.be.equal("f(x,y)=14");
        expect(formatter.format("%[unexistant]F")).to.be.equal("");
    });
});





// describe("Camel case", () => {

//     it(".toCamelCase() should transform a string composed of alphanum - minus - underscore to a camelCase string", () => {
//         expect(string.toCamelCase("one-two-three")).to.be.equal("oneTwoThree");
//         expect(string.toCamelCase("one_two_three")).to.be.equal("oneTwoThree");
//         expect(string.toCamelCase("OnE-tWo_tHree")).to.be.equal("oneTwoThree");
//         expect(string.toCamelCase("ONE-TWO-THREE")).to.be.equal("oneTwoThree");
//         expect(string.toCamelCase("a-b-c")).to.be.equal("aBC");
//     });

//     it(".toCamelCase() edge cases", () => {
//         expect(string.toCamelCase("")).to.be.equal("");
//         expect(string.toCamelCase()).to.be.equal("");
//         expect(string.toCamelCase("u")).to.be.equal("u");
//         expect(string.toCamelCase("U")).to.be.equal("u");
//         expect(string.toCamelCase("U-b")).to.be.equal("uB");
//         expect(string.toCamelCase("U-")).to.be.equal("u");
//         expect(string.toCamelCase("-U")).to.be.equal("u");
//     });

//     it(".camelCaseToDashed() should transform a string composed of alphanum - minus - underscore to a camelCase string", () => {
//         expect(string.camelCaseToDashed("oneTwoThree")).to.be.equal("one-two-three");
//         expect(string.camelCaseToDashed("OneTwoThree")).to.be.equal("one-two-three");
//         expect(string.camelCaseToDashed("aBC")).to.be.equal("a-b-c");
//     });

//     //it( ".camelCaseToDashed() edge cases" , function() {} ) ;
// });



// describe("Latinize", () => {

//     it(".latinize() should transform to regular latin letters without any accent", () => {
//         expect(string.latinize("éàèùâêîôûÂÊÎÔÛäëïöüÄËÏÖÜæÆŧøþßðđħł"))
//             .to.be.equal("eaeuaeiouAEIOUaeiouAEIOUaeAEtothssdhdhl");
//     });
// });



// describe("inspect()", () => {

//     it("should inspect a variable with default options accordingly", () => {

//         const MyClass = function MyClass() {
//             this.variable = 1;
//         };

//         MyClass.prototype.report = function report() {
//             console.log("Variable value:", this.variable);
//         };
//         MyClass.staticFunc = function staticFunc() {
//             console.log("Static function.");
//         };

//         const sparseArray = [];
//         sparseArray[3] = "three";
//         sparseArray[10] = "ten";
//         sparseArray[20] = "twenty";
//         sparseArray.customProperty = "customProperty";

//         const object = {
//             a: "A",
//             b: 2,
//             str: "Woot\nWoot\rWoot\tWoot",
//             sub: {
//                 u: undefined,
//                 n: null,
//                 t: true,
//                 f: false
//             },
//             emptyString: "",
//             emptyObject: {},
//             list: ["one", "two", "three"],
//             emptyList: [],
//             sparseArray,
//             hello: function hello() {
//                 console.log("Hello!");
//             },
//             anonymous() {
//                 console.log("anonymous...");
//             },
//             class: MyClass,
//             instance: new MyClass(),
//             buf: new Buffer("This is a buffer!")
//         };

//         object.sub.circular = object;

//         Object.defineProperties(object, {
//             c: { value: "3" },
//             d: {
//                 get() {
//                     throw new Error("Should not be called by the test");
//                 },
//                 set(value) { }
//             }
//         });

//         //console.log( '>>>>>' , string.escape.control( string.inspect( object ) ) ) ;
//         //console.log( string.inspect( { style: 'color' } , object ) ) ;
//         const actual = string.inspect(object);
//         const expected = '<Object> <object> {\n    a: "A" <string>(1)\n    b: 2 <number>\n    str: "Woot\\nWoot\\rWoot\\tWoot" <string>(19)\n    sub: <Object> <object> {\n        u: undefined\n        n: null\n        t: true\n        f: false\n        circular: <Object> <object> [circular]\n    }\n    emptyString: "" <string>(0)\n    emptyObject: <Object> <object> {}\n    list: <Array>(3) <object> {\n        [0] "one" <string>(3)\n        [1] "two" <string>(3)\n        [2] "three" <string>(5)\n        length: 3 <number> <-conf -enum>\n    }\n    emptyList: <Array>(0) <object> {\n        length: 0 <number> <-conf -enum>\n    }\n    sparseArray: <Array>(21) <object> {\n        [3] "three" <string>(5)\n        [10] "ten" <string>(3)\n        [20] "twenty" <string>(6)\n        length: 21 <number> <-conf -enum>\n        customProperty: "customProperty" <string>(14)\n    }\n    hello: <Function> hello(0) <function>\n    anonymous: <Function> anonymous(0) <function>\n    class: <Function> MyClass(0) <function>\n    instance: <MyClass> <object> {\n        variable: 1 <number>\n    }\n    buf: <Buffer 54 68 69 73 20 69 73 20 61 20 62 75 66 66 65 72 21> <Buffer>(17)\n    c: "3" <string>(1) <-conf -enum -w>\n    d: <getter/setter> {\n        get: <Function> get(0) <function>\n        set: <Function> set(1) <function>\n    }\n}\n';
//         //console.log( '\n' + expected + '\n\n' + actual + '\n\n' ) ;
//         expect(actual).to.be.equal(expected);
//         //console.log( string.inspect( { style: 'color' } , object ) ) ;
//     });

//     it("should pass the Array circular references bug", () => {
//         const array = [[1]];
//         expect(string.inspect(array)).to.be.equal("<Array>(1) <object> {\n    [0] <Array>(1) <object> {\n        [0] 1 <number>\n        length: 1 <number> <-conf -enum>\n    }\n    length: 1 <number> <-conf -enum>\n}\n");
//     });

//     it("special objects tests (ES6 Set & Map, MongoDB ObjectID)");
// });



// describe("Misc", () => {

//     it(".resize()", () => {
//         expect(string.resize("bobby", 3)).to.be.equal("bob");
//         expect(string.resize("bobby", 5)).to.be.equal("bobby");
//         expect(string.resize("bobby", 8)).to.be.equal("bobby   ");
//     });
// });



