const {
    sourcemap: { codec: { encode, decode } }
} = adone;

require("console-group").install();

describe("sourcemap", "codec", () => {
    // TODO more tests
    let tests = [
        {
            encoded: "AAAA",
            decoded: [[new Int32Array([0, 0, 0, 0])]]
        },
        {
            encoded: ";;;",
            decoded: [[], [], [], []]
        },
        {
            encoded: "A,AAAA;;AACDE;",
            decoded: [
                [new Int32Array([0]), new Int32Array([0, 0, 0, 0])],
                [],
                [new Int32Array([0, 0, 1, -1, 2])],
                []
            ]
        },
        {
            encoded: ";;;;EAEEA,EAAE,EAAC,CAAE;ECQY,UACC",
            decoded: [
                [],
                [],
                [],
                [],
                [new Int32Array([2, 0, 2, 2, 0]), new Int32Array([4, 0, 2, 4]), new Int32Array([6, 0, 2, 5]), new Int32Array([7, 0, 2, 7])],
                [new Int32Array([2, 1, 10, 19]), new Int32Array([12, 1, 11, 20])]
            ]
        },
        {
            encoded: "aAAA,IAAIA,eAAW,oCAAoCC,cACpC,aACdC,OAAOC,MAAOH,eAAU,GCFzB,5PAAIA,iBAAW,sBAAsBC,cACtB,aACdC,OAAOC,MAAOH,iBAAU,GCCzBI,IACAC",
            decoded: [
                [
                    new Int32Array([13, 0, 0, 0]),
                    new Int32Array([17, 0, 0, 4, 0]),
                    new Int32Array([32, 0, 0, 15]),
                    new Int32Array([68, 0, 0, 51, 1]),
                    new Int32Array([82, 0, 1, 15]),
                    new Int32Array([95, 0, 2, 1, 2]),
                    new Int32Array([102, 0, 2, 8, 3]),
                    new Int32Array([108, 0, 2, 15, 0]),
                    new Int32Array([123, 0, 2, 25]),
                    new Int32Array([126, 1, 0, 0]),
                    new Int32Array([-126, 1, 0, 4, 0]),
                    new Int32Array([-109, 1, 0, 15]),
                    new Int32Array([-87, 1, 0, 37, 1]),
                    new Int32Array([-73, 1, 1, 15]),
                    new Int32Array([-60, 1, 2, 1, 2]),
                    new Int32Array([-53, 1, 2, 8, 3]),
                    new Int32Array([-47, 1, 2, 15, 0]),
                    new Int32Array([-30, 1, 2, 25]),
                    new Int32Array([-27, 2, 3, 0, 4]),
                    new Int32Array([-23, 2, 4, 0, 5])
                ]
            ]
        },
        {
            encoded: "AAAA,aAEA,IAAIA,eAAiB,oCAAoCC,cACzD,SAASC,IACRC,OAAOC,MAAOJ,eAAgB,GAG/B,IAAIK,iBAAmB,sBAAsBJ,cAC7C,SAASK,IACRH,OAAOC,MAAOC,iBAAkB,GAGjCH,IACAI",
            decoded: [
                [
                    new Int32Array([0, 0, 0, 0]),
                    new Int32Array([13, 0, 2, 0]),
                    new Int32Array([17, 0, 2, 4, 0]),
                    new Int32Array([32, 0, 2, 21]),
                    new Int32Array([68, 0, 2, 57, 1]),
                    new Int32Array([82, 0, 3, 0]),
                    new Int32Array([91, 0, 3, 9, 2]),
                    new Int32Array([95, 0, 4, 1, 3]),
                    new Int32Array([102, 0, 4, 8, 4]),
                    new Int32Array([108, 0, 4, 15, 0]),
                    new Int32Array([123, 0, 4, 31]),
                    new Int32Array([126, 0, 7, 0]),
                    new Int32Array([130, 0, 7, 4, 5]),
                    new Int32Array([147, 0, 7, 23]),
                    new Int32Array([169, 0, 7, 45, 1]),
                    new Int32Array([183, 0, 8, 0]),
                    new Int32Array([192, 0, 8, 9, 6]),
                    new Int32Array([196, 0, 9, 1, 3]),
                    new Int32Array([203, 0, 9, 8, 4]),
                    new Int32Array([209, 0, 9, 15, 5]),
                    new Int32Array([226, 0, 9, 33]),
                    new Int32Array([229, 0, 12, 0, 2]),
                    new Int32Array([233, 0, 13, 0, 6])
                ]
            ]
        },
        {
            encoded: "CAAC,SAAUA,EAAQC,GACC,iBAAZC,SAA0C,oBAAXC,OAAyBF,IAC7C,mBAAXG,QAAyBA,OAAOC,IAAMD,OAAOH,GACnDA,IAHF,CAIEK,EAAM,WAAe,aAEtB,IAAIC,EAAiB,oCAAoCC,cAKzD,IAAIC,EAAmB,sBAAsBD,cAH5CE,OAAOC,MAAOJ,EAAgB,GAK9BG,OAAOC,MAAOF,EAAkB",
            decoded: [
                [
                    new Int32Array([1, 0, 0, 1]),
                    new Int32Array([10, 0, 0, 11, 0]),
                    new Int32Array([12, 0, 0, 19, 1]),
                    new Int32Array([15, 0, 1, 20]),
                    new Int32Array([32, 0, 1, 8, 2]),
                    new Int32Array([41, 0, 1, 50]),
                    new Int32Array([61, 0, 1, 39, 3]),
                    new Int32Array([68, 0, 1, 64, 1]),
                    new Int32Array([72, 0, 2, 19]),
                    new Int32Array([91, 0, 2, 8, 4]),
                    new Int32Array([99, 0, 2, 33, 4]),
                    new Int32Array([106, 0, 2, 40, 5]),
                    new Int32Array([110, 0, 2, 46, 4]),
                    new Int32Array([117, 0, 2, 53, 1]),
                    new Int32Array([120, 0, 3, 2, 1]),
                    new Int32Array([124, 0, 0, 0]),
                    new Int32Array([125, 0, 4, 2, 6]),
                    new Int32Array([127, 0, 4, 8]),
                    new Int32Array([138, 0, 4, 23]),
                    new Int32Array([151, 0, 6, 1]),
                    new Int32Array([155, 0, 6, 5, 7]),
                    new Int32Array([157, 0, 6, 22]),
                    new Int32Array([193, 0, 6, 58, 8]),
                    new Int32Array([207, 0, 11, 1]),
                    new Int32Array([211, 0, 11, 5, 9]),
                    new Int32Array([213, 0, 11, 24]),
                    new Int32Array([235, 0, 11, 46, 8]),
                    new Int32Array([249, 0, 8, 2, 10]),
                    new Int32Array([256, 0, 8, 9, 11]),
                    new Int32Array([262, 0, 8, 16, 7]),
                    new Int32Array([264, 0, 8, 32]),
                    new Int32Array([267, 0, 13, 2, 10]),
                    new Int32Array([274, 0, 13, 9, 11]),
                    new Int32Array([280, 0, 13, 16, 9]),
                    new Int32Array([282, 0, 13, 34])
                ]
            ]
        },
        {
            // Make sure Int16 isn't being used
            encoded: "gw+BAAAA,w+BAAAA,w+BAAAA,w+BAAAA",
            decoded: [
                [
                    new Int32Array([32000, 0, 0, 0, 0]),
                    new Int32Array([33000, 0, 0, 0, 0]),
                    new Int32Array([34000, 0, 0, 0, 0]),
                    new Int32Array([35000, 0, 0, 0, 0])
                ]
            ]
        }
    ];

    const filtered = tests.filter((test) => {
        return test.solo;
    });

    tests = filtered.length ? filtered : tests;

    describe("decode()", () => {
        tests.forEach((test, i) => {
            it(`decodes sample ${i}`, () => {
                assert.sameDeepMembers(decode(test.encoded), test.decoded);
            });
        });
    });

    describe("encode()", () => {
        tests.forEach((test, i) => {
            it(`encodes sample ${i}`, () => {
                assert.equal(encode(test.decoded), test.encoded);
            });
        });
    });
});
