import Support from "../../support";

const { orm } = adone;
const { type } = orm;
const expectsql = Support.expectsql;
const current = Support.sequelize;
const sql = current.dialect.QueryGenerator;

// Notice: [] will be replaced by dialect specific tick/quote character when there is not dialect specific expectation but only a default expectation
if (current.dialect.supports.JSON) {
    describe(Support.getTestDialectTeaser("SQL"), () => {
        describe("JSON", () => {
            describe("escape", () => {
                it("plain string", () => {
                    expectsql(sql.escape("string", { type: new type.JSON() }), {
                        default: '\'"string"\'',
                        mysql: '\'\\"string\\"\''
                    });
                });

                it("plain int", () => {
                    expectsql(sql.escape(0, { type: new type.JSON() }), {
                        default: "'0'"
                    });
                    expectsql(sql.escape(123, { type: new type.JSON() }), {
                        default: "'123'"
                    });
                });

                it("boolean", () => {
                    expectsql(sql.escape(true, { type: new type.JSON() }), {
                        default: "'true'"
                    });
                    expectsql(sql.escape(false, { type: new type.JSON() }), {
                        default: "'false'"
                    });
                });

                it("NULL", () => {
                    expectsql(sql.escape(null, { type: new type.JSON() }), {
                        default: "NULL"
                    });
                });

                it("nested object", () => {
                    expectsql(sql.escape({ some: "nested", more: { nested: true }, answer: 42 }, { type: new type.JSON() }), {
                        default: '\'{"some":"nested","more":{"nested":true},"answer":42}\'',
                        mysql: '\'{\\"some\\":\\"nested\\",\\"more\\":{\\"nested\\":true},\\"answer\\":42}\''
                    });
                });

                if (current.dialect.supports.ARRAY) {
                    it("array of JSON", () => {
                        expectsql(sql.escape([
                            { some: "nested", more: { nested: true }, answer: 42 },
                            43,
                            "joe"
                        ], { type: new type.ARRAY(type.JSON) }), {
                            postgres: 'ARRAY[\'{"some":"nested","more":{"nested":true},"answer":42}\',\'43\',\'"joe"\']::JSON[]'
                        });
                    });

                    if (current.dialect.supports.JSONB) {
                        it("array of JSONB", () => {
                            expectsql(sql.escape([
                                { some: "nested", more: { nested: true }, answer: 42 },
                                43,
                                "joe"
                            ], { type: new type.ARRAY(type.JSONB) }), {
                                postgres: 'ARRAY[\'{"some":"nested","more":{"nested":true},"answer":42}\',\'43\',\'"joe"\']::JSONB[]'
                            });
                        });
                    }
                }
            });

            describe("path extraction", () => {
                it("condition object", () => {
                    expectsql(sql.whereItemQuery(undefined, orm.util.json({ id: 1 })), {
                        postgres: '("id"#>>\'{}\') = \'1\'',
                        sqlite: "json_extract(`id`, '$') = '1'",
                        mysql: "`id`->>'$.' = '1'"
                    });
                });

                it("nested condition object", () => {
                    expectsql(sql.whereItemQuery(undefined, orm.util.json({ profile: { id: 1 } })), {
                        postgres: '("profile"#>>\'{id}\') = \'1\'',
                        sqlite: "json_extract(`profile`, '$.id') = '1'",
                        mysql: "`profile`->>'$.id' = '1'"
                    });
                });

                it("multiple condition object", () => {
                    expectsql(sql.whereItemQuery(undefined, orm.util.json({ property: { value: 1 }, another: { value: "string" } })), {
                        postgres: '("property"#>>\'{value}\') = \'1\' AND ("another"#>>\'{value}\') = \'string\'',
                        sqlite: "json_extract(`property`, '$.value') = '1' AND json_extract(`another`, '$.value') = 'string'",
                        mysql: "`property`->>'$.value' = '1' and `another`->>'$.value' = 'string'"
                    });
                });

                it("dot notation", () => {
                    expectsql(sql.whereItemQuery(orm.util.json("profile.id"), "1"), {
                        postgres: '("profile"#>>\'{id}\') = \'1\'',
                        sqlite: "json_extract(`profile`, '$.id') = '1'",
                        mysql: "`profile`->>'$.id' = '1'"
                    });
                });

                it('column named "json"', () => {
                    expectsql(sql.whereItemQuery(orm.util.json("json"), "{}"), {
                        postgres: '("json"#>>\'{}\') = \'{}\'',
                        sqlite: "json_extract(`json`, '$') = '{}'",
                        mysql: "`json`->>'$.' = '{}'"
                    });
                });
            });

            describe("raw json query", () => {
                if (current.dialect.name === "postgres") {
                    it("#>> operator", () => {
                        expectsql(sql.whereItemQuery(orm.util.json('("data"#>>\'{id}\')'), "id"), {
                            postgres: '("data"#>>\'{id}\') = \'id\''
                        });
                    });
                }

                it("json function", () => {
                    expectsql(sql.handleSequelizeMethod(orm.util.json('json(\'{"profile":{"name":"david"}}\')')), {
                        default: 'json(\'{"profile":{"name":"david"}}\')'
                    });
                });

                it("nested json functions", () => {
                    expectsql(sql.handleSequelizeMethod(orm.util.json('json_extract(json_object(\'{"profile":null}\'), "profile")')), {
                        default: 'json_extract(json_object(\'{"profile":null}\'), "profile")'
                    });
                });

                it("escaped string argument", () => {
                    expectsql(sql.handleSequelizeMethod(orm.util.json('json(\'{"quote":{"single":"\'\'","double":""""},"parenthesis":"())("}\')')), {
                        default: 'json(\'{"quote":{"single":"\'\'","double":""""},"parenthesis":"())("}\')'
                    });
                });

                it("unbalnced statement", () => {
                    expect(() => sql.handleSequelizeMethod(orm.util.json("json())"))).to.throw();
                    expect(() => sql.handleSequelizeMethod(orm.util.json("json_extract(json()"))).to.throw();
                });

                it("separator injection", () => {
                    expect(() => sql.handleSequelizeMethod(orm.util.json("json(; DELETE YOLO INJECTIONS; -- )"))).to.throw();
                    expect(() => sql.handleSequelizeMethod(orm.util.json("json(); DELETE YOLO INJECTIONS; -- "))).to.throw();
                });
            });
        });
    });
}
