const {
    is,
    fake
} = adone;

describe("address.js", () => {
    describe("city()", () => {
        beforeEach(() => {
            spy(fake.address, "cityPrefix");
            spy(fake.name, "firstName");
            spy(fake.name, "lastName");
            spy(fake.address, "citySuffix");
        });

        afterEach(() => {
            fake.random.number.restore();
            fake.address.cityPrefix.restore();
            fake.name.firstName.restore();
            fake.name.lastName.restore();
            fake.address.citySuffix.restore();
        });

        it("occasionally returns prefix + first name + suffix", () => {
            stub(fake.random, "number").returns(0);

            const city = fake.address.city();
            assert.ok(city);

            assert.ok(fake.address.cityPrefix.calledOnce);
            assert.ok(fake.name.firstName.calledOnce);
            assert.ok(fake.address.citySuffix.calledOnce);
        });

        it("occasionally returns prefix + first name", () => {
            stub(fake.random, "number").returns(1);

            const city = fake.address.city();
            assert.ok(city);

            assert.ok(fake.address.cityPrefix.calledOnce);
            assert.ok(fake.name.firstName.calledOnce);
        });

        it("occasionally returns first name + suffix", () => {
            stub(fake.random, "number").returns(2);

            const city = fake.address.city();
            assert.ok(city);

            assert.ok(fake.address.citySuffix.calledOnce);
        });

        it("occasionally returns last name + suffix", () => {
            stub(fake.random, "number").returns(3);

            const city = fake.address.city();
            assert.ok(city);

            assert.ok(!fake.address.cityPrefix.called);
            assert.ok(!fake.name.firstName.called);
            assert.ok(fake.name.lastName.calledOnce);
            assert.ok(fake.address.citySuffix.calledOnce);
        });
    });


    describe("streetName()", () => {
        beforeEach(() => {
            spy(fake.name, "firstName");
            spy(fake.name, "lastName");
            spy(fake.address, "streetSuffix");
        });

        afterEach(() => {
            fake.name.firstName.restore();
            fake.name.lastName.restore();
            fake.address.streetSuffix.restore();
        });

        it("occasionally returns last name + suffix", () => {
            stub(fake.random, "number").returns(0);

            const street_name = fake.address.streetName();
            assert.ok(street_name);
            assert.ok(!fake.name.firstName.called);
            assert.ok(fake.name.lastName.calledOnce);
            assert.ok(fake.address.streetSuffix.calledOnce);

            fake.random.number.restore();
        });

        it("occasionally returns first name + suffix", () => {
            stub(fake.random, "number").returns(1);

            const street_name = fake.address.streetName();
            assert.ok(street_name);

            assert.ok(fake.name.firstName.calledOnce);
            assert.ok(!fake.name.lastName.called);
            assert.ok(fake.address.streetSuffix.calledOnce);

            fake.random.number.restore();
        });

        it("trims trailing whitespace from the name", () => {
            fake.address.streetSuffix.restore();

            stub(fake.address, "streetSuffix").returns("");
            const street_name = fake.address.streetName();
            assert.ok(!street_name.match(/ $/));
        });
    });



    describe("streetAddress()", () => {
        beforeEach(() => {
            spy(fake.address, "streetName");
            spy(fake.address, "secondaryAddress");
        });

        afterEach(() => {
            fake.address.streetName.restore();
            fake.address.secondaryAddress.restore();
        });

        it("occasionally returns a 5-digit street number", () => {
            stub(fake.random, "number").returns(0);
            const address = fake.address.streetAddress();
            const parts = address.split(" ");

            assert.equal(parts[0].length, 5);
            assert.ok(fake.address.streetName.called);

            fake.random.number.restore();
        });

        it("occasionally returns a 4-digit street number", () => {
            stub(fake.random, "number").returns(1);
            const address = fake.address.streetAddress();
            const parts = address.split(" ");

            assert.equal(parts[0].length, 4);
            assert.ok(fake.address.streetName.called);

            fake.random.number.restore();
        });

        it("occasionally returns a 3-digit street number", () => {
            stub(fake.random, "number").returns(2);
            const address = fake.address.streetAddress();
            const parts = address.split(" ");

            assert.equal(parts[0].length, 3);
            assert.ok(fake.address.streetName.called);
            assert.ok(!fake.address.secondaryAddress.called);

            fake.random.number.restore();
        });

        context("when useFulladdress is true", () => {
            it("adds a secondary address to the result", () => {
                const address = fake.address.streetAddress(true);
                const parts = address.split(" ");

                assert.ok(fake.address.secondaryAddress.called);
            });
        });
    });


    describe("secondaryAddress()", () => {
        it("randomly chooses an Apt or Suite number", () => {
            spy(fake.random, "arrayElement");

            const address = fake.address.secondaryAddress();

            const expected_array = [
                "Apt. ###",
                "Suite ###"
            ];

            assert.ok(address);
            assert.ok(fake.random.arrayElement.calledWith(expected_array));
            fake.random.arrayElement.restore();
        });
    });

    describe("county()", () => {
        it("returns random county", () => {
            spy(fake.address, "county");
            const county = fake.address.county();
            assert.ok(county);
            assert.ok(fake.address.county.called);
            fake.address.county.restore();
        });
    });

    describe("country()", () => {
        it("returns random country", () => {
            spy(fake.address, "country");
            const country = fake.address.country();
            assert.ok(country);
            assert.ok(fake.address.country.called);
            fake.address.country.restore();
        });
    });

    describe("countryCode()", () => {
        it("returns random countryCode", () => {
            spy(fake.address, "countryCode");
            const countryCode = fake.address.countryCode();
            assert.ok(countryCode);
            assert.ok(fake.address.countryCode.called);
            fake.address.countryCode.restore();
        });
    });

    describe("state()", () => {
        it("returns random state", () => {
            spy(fake.address, "state");
            const state = fake.address.state();
            assert.ok(state);
            assert.ok(fake.address.state.called);
            fake.address.state.restore();
        });
    });

    describe("zipCode()", () => {
        it("returns random zipCode", () => {
            spy(fake.address, "zipCode");
            const zipCode = fake.address.zipCode();
            assert.ok(zipCode);
            assert.ok(fake.address.zipCode.called);
            fake.address.zipCode.restore();
        });

        it("returns random zipCode - user specified format", () => {
            let zipCode = fake.address.zipCode("?#? #?#");
            assert.ok(zipCode.match(/^[A-Za-z]\d[A-Za-z]\s\d[A-Za-z]\d$/));
            // try another format
            zipCode = fake.address.zipCode("###-###");
            assert.ok(zipCode.match(/^\d{3}-\d{3}$/));
        });

        it.only("returns zipCode with proper locale format", () => {
            // we'll use the en_CA locale..
            fake.setLocale("en_CA");
            const zipCode = fake.address.zipCode();
            assert.ok(zipCode.match(/^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/));
        });
    });

    describe("latitude()", () => {
        it("returns random latitude", () => {
            for (let i = 0; i < 100; i++) {
                spy(fake.random, "number");
                const latitude = fake.address.latitude();
                assert.ok(is.string(latitude));
                const latitude_float = parseFloat(latitude);
                assert.ok(latitude_float >= -90.0);
                assert.ok(latitude_float <= 90.0);
                assert.ok(fake.random.number.called);
                fake.random.number.restore();
            }
        });

        it("returns latitude with min and max", () => {
            for (let i = 0; i < 100; i++) {
                spy(fake.random, "number");
                const latitude = fake.address.latitude(-5, 5);
                assert.ok(is.string(latitude));
                const latitude_float = parseFloat(latitude);
                assert.ok(latitude_float >= -5);
                assert.ok(latitude_float <= 5);
                assert.ok(fake.random.number.called);
                fake.random.number.restore();
            }
        });
    });

    describe("longitude()", () => {
        it("returns random longitude", () => {
            for (let i = 0; i < 100; i++) {
                spy(fake.random, "number");
                const longitude = fake.address.longitude();
                assert.ok(is.string(longitude));
                const longitude_float = parseFloat(longitude);
                assert.ok(longitude_float >= -180.0);
                assert.ok(longitude_float <= 180.0);
                assert.ok(fake.random.number.called);
                fake.random.number.restore();
            }
        });

        it("returns random longitude with min and max", () => {
            for (let i = 0; i < 100; i++) {
                spy(fake.random, "number");
                const longitude = fake.address.longitude(100, -30);
                assert.ok(is.string(longitude));
                const longitude_float = parseFloat(longitude);
                assert.ok(longitude_float >= -30);
                assert.ok(longitude_float <= 100);
                assert.ok(fake.random.number.called);
                fake.random.number.restore();
            }
        });
    });

    describe("direction()", () => {
        it("returns random direction", () => {
            stub(fake.address, "direction").returns("North");
            const direction = fake.address.direction();

            assert.equal(direction, "North");
            fake.address.direction.restore();
        });

        it("returns abbreviation when useAbbr is true", () => {
            stub(fake.address, "direction").returns("N");
            const direction = fake.address.direction(true);

            assert.equal(direction, "N");
            fake.address.direction.restore();
        });
    });

    describe("ordinalDirection()", () => {
        it("returns random ordinal direction", () => {
            stub(fake.address, "ordinalDirection").returns("West");
            const ordinalDirection = fake.address.ordinalDirection();

            assert.equal(ordinalDirection, "West");
            fake.address.ordinalDirection.restore();
        });

        it("returns abbreviation when useAbbr is true", () => {
            stub(fake.address, "ordinalDirection").returns("W");
            const ordinalDirection = fake.address.ordinalDirection(true);

            assert.equal(ordinalDirection, "W");
            fake.address.ordinalDirection.restore();
        });
    });

    describe("cardinalDirection()", () => {
        it("returns random cardinal direction", () => {
            stub(fake.address, "cardinalDirection").returns("Northwest");
            const cardinalDirection = fake.address.cardinalDirection();

            assert.equal(cardinalDirection, "Northwest");
            fake.address.cardinalDirection.restore();
        });

        it("returns abbreviation when useAbbr is true", () => {
            stub(fake.address, "cardinalDirection").returns("NW");
            const cardinalDirection = fake.address.cardinalDirection(true);

            assert.equal(cardinalDirection, "NW");
            fake.address.cardinalDirection.restore();
        });
    });
});
