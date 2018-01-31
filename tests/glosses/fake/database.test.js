const {
    fake
} = adone;

describe("database.js", () => {
    describe("column()", () => {
        it("returns a column name", () => {
            stub(fake.database, "column").returns("title");
            const column = fake.database.column();

            assert.equal(column, "title");
            fake.database.column.restore();
        });
    });

    describe("collation()", () => {
        it("returns a collation", () => {
            stub(fake.database, "collation").returns("utf8_bin");
            const collation = fake.database.collation();

            assert.equal(collation, "utf8_bin");
            fake.database.collation.restore();
        });
    });

    describe("engine()", () => {
        it("returns an engine", () => {
            stub(fake.database, "engine").returns("InnoDB");
            const engine = fake.database.engine();

            assert.equal(engine, "InnoDB");
            fake.database.engine.restore();
        });
    });

    describe("type()", () => {
        it("returns a column type", () => {
            stub(fake.database, "type").returns("int");
            const type = fake.database.type();

            assert.equal(type, "int");
            fake.database.type.restore();
        });
    });
});
