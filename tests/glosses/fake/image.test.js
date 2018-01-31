const {
    fake
} = adone;

describe("image.js", () => {
    describe("imageUrl()", () => {
        it("returns a random image url from lorempixel", () => {
            const imageUrl = fake.image.imageUrl();

            assert.equal(imageUrl, "http://lorempixel.com/640/480");
        });
        it("returns a random image url from lorempixel with width and height", () => {
            const imageUrl = fake.image.imageUrl(100, 100);

            assert.equal(imageUrl, "http://lorempixel.com/100/100");
        });
        it("returns a random image url for a specified category", () => {
            const imageUrl = fake.image.imageUrl(100, 100, "abstract");

            assert.equal(imageUrl, "http://lorempixel.com/100/100/abstract");
        });
        /*
        it.only("returns a random image url from lorempixel with a randomizer", function () {
            var imageUrl = fake.image.imageUrl(100, 100, undefined, true);

            console.log(imageUrl);
            assert.ok(imageUrl.match(/^http:\/\/lorempixel.com\/100\/100\?[\d]+$/));
        });
        */
    });
    describe("avatar()", () => {
        it("return a random avatar from UIFaces", () => {
            assert.notEqual(-1, fake.image.avatar().indexOf("s3.amazonaws.com/uifaces/faces"));
        });
    });
    describe("abstract()", () => {
        it("returns a random abstract image url", () => {
            const abstract = fake.image.abstract();
            assert.equal(abstract, "http://lorempixel.com/640/480/abstract");
        });
    });
    describe("animals()", () => {
        it("returns a random animals image url", () => {
            const animals = fake.image.animals();
            assert.equal(animals, "http://lorempixel.com/640/480/animals");
        });
    });
    describe("business()", () => {
        it("returns a random business image url", () => {
            const business = fake.image.business();
            assert.equal(business, "http://lorempixel.com/640/480/business");
        });
    });
    describe("cats()", () => {
        it("returns a random cats image url", () => {
            const cats = fake.image.cats();
            assert.equal(cats, "http://lorempixel.com/640/480/cats");
        });
    });
    describe("city()", () => {
        it("returns a random city image url", () => {
            const city = fake.image.city();
            assert.equal(city, "http://lorempixel.com/640/480/city");
        });
    });
    describe("food()", () => {
        it("returns a random food image url", () => {
            const food = fake.image.food();
            assert.equal(food, "http://lorempixel.com/640/480/food");
        });
    });
    describe("nightlife()", () => {
        it("returns a random nightlife image url", () => {
            const nightlife = fake.image.nightlife();
            assert.equal(nightlife, "http://lorempixel.com/640/480/nightlife");
        });
    });
    describe("fashion()", () => {
        it("returns a random fashion image url", () => {
            const fashion = fake.image.fashion();
            assert.equal(fashion, "http://lorempixel.com/640/480/fashion");
        });
    });
    describe("people()", () => {
        it("returns a random people image url", () => {
            const people = fake.image.people();
            assert.equal(people, "http://lorempixel.com/640/480/people");
        });
    });
    describe("nature()", () => {
        it("returns a random nature image url", () => {
            const nature = fake.image.nature();
            assert.equal(nature, "http://lorempixel.com/640/480/nature");
        });
    });
    describe("sports()", () => {
        it("returns a random sports image url", () => {
            const sports = fake.image.sports();
            assert.equal(sports, "http://lorempixel.com/640/480/sports");
        });
    });
    describe("technics()", () => {
        it("returns a random technics image url", () => {
            const technics = fake.image.technics();
            assert.equal(technics, "http://lorempixel.com/640/480/technics");
        });
    });
    describe("transport()", () => {
        it("returns a random transport image url", () => {
            const transport = fake.image.transport();
            assert.equal(transport, "http://lorempixel.com/640/480/transport");
        });
    });
    describe("dataUri", () => {
        it("returns a blank data", () => {
            const dataUri = fake.image.dataUri(200, 300);
            assert.equal(dataUri, "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20baseProfile%3D%22full%22%20width%3D%22200%22%20height%3D%22300%22%3E%20%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22grey%22%2F%3E%20%20%3Ctext%20x%3D%220%22%20y%3D%2220%22%20font-size%3D%2220%22%20text-anchor%3D%22start%22%20fill%3D%22white%22%3E200x300%3C%2Ftext%3E%20%3C%2Fsvg%3E");
        });
    });
});
