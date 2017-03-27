describe("glosses", "crypto", "crc32", () => {
    const { crypto: { crc32 } } = adone;

    specify("simple", () => {
        {
            const input = Buffer.from("hey sup bros");
            const expected = Buffer.from([0x47, 0xfa, 0x55, 0x70]);
            expect(crc32.buffer(input)).to.be.deep.equal(expected);
        }
        {
            const input = Buffer.from("IEND");
            const expected = Buffer.from([0xae, 0x42, 0x60, 0x82]);
            expect(crc32.buffer(input)).to.be.deep.equal(expected);
        }
        {
            const input = Buffer.from([0x00, 0x00, 0x00]);
            const expected = Buffer.from([0xff, 0x41, 0xd9, 0x12]);
            expect(crc32.buffer(input)).to.be.deep.equal(expected);
        }
        {
            const input = Buffer.from("शीर्षक");
            const expected = Buffer.from([0x17, 0xb8, 0xaf, 0xf1]);
            expect(crc32.buffer(input)).to.be.deep.equal(expected);
        }
    });

    it("casts to buffer if necessary", () => {
        const input = "शीर्षक";
        const expected = Buffer.from([0x17, 0xb8, 0xaf, 0xf1]);
        expect(crc32.buffer(input)).to.be.deep.equal(expected);
    });

    specify("signed", () => {
        const input = "ham sandwich";
        const expected = -1891873021;
        expect(crc32.signed(input)).to.be.equal(expected);
    });

    specify("unsigned", () => {
        const input = "bear sandwich";
        const expected = 3711466352;
        expect(crc32.unsigned(input)).to.be.equal(expected);
    });

    specify("simple in append mode", () => {
        const input = [
            Buffer.from("hey"),
            Buffer.from(" "),
            Buffer.from("sup"),
            Buffer.from(" "),
            Buffer.from("bros")
        ];
        const expected = Buffer.from([0x47, 0xfa, 0x55, 0x70]);
        let crc = 0;
        for (const buf of input) {
            crc = crc32.buffer(buf, crc);
        }
        expect(crc).to.be.deep.equal(expected);
    });

    specify("signed append mode", () => {
        const input1 = "ham";
        const input2 = " ";
        const input3 = "sandwich";
        const expected = -1891873021;

        let crc = crc32.signed(input1);
        crc = crc32.signed(input2, crc);
        crc = crc32.signed(input3, crc);
        expect(crc).to.be.equal(expected);
    });

    specify("unsigned append mode", () => {
        const input1 = "bear san";
        const input2 = "dwich";
        const expected = 3711466352;

        let crc = crc32.unsigned(input1);
        crc = crc32.unsigned(input2, crc);
        expect(crc).to.be.equal(expected);
    });

    specify("integers as the first arg", () => {
        expect(crc32.buffer(0)).to.be.deep.equal(Buffer.from([0x00, 0x00, 0x00, 0x00]));
    });

    it("should throw on bad input", () => {
        expect(() => {
            crc32.buffer({});
        }).to.throw();
    });
});
