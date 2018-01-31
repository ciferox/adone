const {
    fake
} = adone;

describe("internet.js", () => {
    describe("email()", () => {
        it("returns an email", () => {
            stub(fake.internet, "userName").returns("Aiden.Harann55");
            const email = fake.internet.email("Aiden.Harann55");
            let res = email.split("@");
            res = res[0];
            assert.equal(res, "Aiden.Harann55");
            fake.internet.userName.restore();
        });
    });

    describe("exampleEmail", () => {
        it("returns an email with the correct name", () => {
            stub(fake.internet, "userName").returns("Aiden.Harann55");
            const email = fake.internet.email("Aiden.Harann55");
            let res = email.split("@");
            res = res[0];
            assert.equal(res, "Aiden.Harann55");
            fake.internet.userName.restore();
        });

        it("uses the example.[org|com|net] host", () => {
            const email = fake.internet.exampleEmail();
            assert.ok(email.match(/@example\.(org|com|net)$/));
        });
    });

    describe("userName()", () => {
        it("occasionally returns a single firstName", () => {
            stub(fake.random, "number").returns(0);
            spy(fake.name, "firstName");
            const username = fake.internet.userName();

            assert.ok(username);
            assert.ok(fake.name.firstName.called);

            fake.random.number.restore();
            fake.name.firstName.restore();
        });

        it("occasionally returns a firstName with a period or hyphen and a lastName", () => {
            stub(fake.random, "number").returns(1);
            spy(fake.name, "firstName");
            spy(fake.name, "lastName");
            spy(fake.random, "arrayElement");
            const username = fake.internet.userName();

            assert.ok(username);
            assert.ok(fake.name.firstName.called);
            assert.ok(fake.name.lastName.called);
            assert.ok(fake.random.arrayElement.calledWith([".", "_"]));

            fake.random.number.restore();
            fake.name.firstName.restore();
            fake.name.lastName.restore();
            fake.random.arrayElement.restore();
        });
    });

    describe("domainName()", () => {
        it("returns a domainWord plus a random suffix", () => {
            stub(fake.internet, "domainWord").returns("bar");
            stub(fake.internet, "domainSuffix").returns("net");

            const domain_name = fake.internet.domainName();

            assert.equal(domain_name, "bar.net");

            fake.internet.domainWord.restore();
            fake.internet.domainSuffix.restore();
        });
    });

    describe("domainWord()", () => {
        it("returns a lower-case firstName", () => {
            stub(fake.name, "firstName").returns("FOO");
            const domain_word = fake.internet.domainWord();

            assert.ok(domain_word);
            assert.strictEqual(domain_word, "foo");

            fake.name.firstName.restore();
        });
        describe("when the firstName used contains a apostrophe", () => {
            stub(fake.name, "firstName").returns("d'angelo");
            const domain_word = fake.internet.domainWord();

            it("should remove the apostrophe", () => {
                assert.strictEqual(domain_word, "dangelo");
            });

            fake.name.firstName.restore();
        });
    });

    describe("protocol()", () => {
        it("returns a valid protocol", () => {
            const protocol = fake.internet.protocol();
            assert.ok(protocol);
        });

        it("should occasionally return http", () => {
            stub(fake.random, "number").returns(0);
            const protocol = fake.internet.protocol();
            assert.ok(protocol);
            assert.strictEqual(protocol, "http");

            fake.random.number.restore();
        });

        it("should occasionally return https", () => {
            stub(fake.random, "number").returns(1);
            const protocol = fake.internet.protocol();
            assert.ok(protocol);
            assert.strictEqual(protocol, "https");

            fake.random.number.restore();
        });
    });

    describe("url()", () => {
        it("returns a valid url", () => {
            stub(fake.internet, "protocol").returns("http");
            stub(fake.internet, "domainWord").returns("bar");
            stub(fake.internet, "domainSuffix").returns("net");

            const url = fake.internet.url();

            assert.ok(url);
            assert.strictEqual(url, "http://bar.net");
        });
    });

    describe("ip()", () => {
        it("returns a random IP address with four parts", () => {
            const ip = fake.internet.ip();
            const parts = ip.split(".");
            assert.equal(parts.length, 4);
        });
    });

    describe("ipv6()", () => {
        it("returns a random IPv6 address with eight parts", () => {
            const ip = fake.internet.ipv6();
            const parts = ip.split(":");
            assert.equal(parts.length, 8);
        });
    });

    describe("userAgent()", () => {
        it("returns a valid user-agent", () => {
            const ua = fake.internet.userAgent();
            assert.ok(ua);
        });
    });

    describe("color()", () => {
        it("returns a valid hex value (like #ffffff)", () => {
            const color = fake.internet.color(100, 100, 100);
            assert.ok(color.match(/^#[a-f0-9]{6}$/));
        });
    });

    describe("mac()", () => {
        it("returns a random MAC address with 6 hexadecimal digits", () => {
            const mac = fake.internet.mac();
            assert.ok(mac.match(/^([a-f0-9]{2}:){5}[a-f0-9]{2}$/));
        });

        it("uses the dash separator if we pass it in as our separator", () => {
            const mac = fake.internet.mac("-");
            assert.ok(mac.match(/^([a-f0-9]{2}-){5}[a-f0-9]{2}$/));
        });

        it("uses no separator if we pass in an empty string", () => {
            const mac = fake.internet.mac("");
            assert.ok(mac.match(/^[a-f0-9]{12}$/));
        });

        it("uses the default colon (:) if we provide an unacceptable separator", () => {
            let mac = fake.internet.mac("!");
            assert.ok(mac.match(/^([a-f0-9]{2}:){5}[a-f0-9]{2}$/));

            mac = fake.internet.mac("&");
            assert.ok(mac.match(/^([a-f0-9]{2}:){5}[a-f0-9]{2}$/));
        });
    });
});
