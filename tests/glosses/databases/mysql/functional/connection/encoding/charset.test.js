import { createConnection } from "../../../common";

describe("glosses", "databases", "mysql", "functional", "connection", "encoding", "charset", () => {
    const { database: { mysql } } = adone;

    const payload = "привет, мир";

    let connection = null;

    before(async () => {
        connection = await createConnection();
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    const tryEncoding = (encoding) => {
        specify(encoding, async () => {
            await connection.query("set character_set_results = ?", [encoding]);
            const [rows, fields] = await connection.query("SELECT ?", [payload]);

            let iconvEncoding = encoding;
            if (encoding == "utf8mb4") {
                iconvEncoding = "utf8";
            }
            assert.equal(mysql.c.charsetEncoding[fields[0].characterSet], iconvEncoding);
            assert.equal(fields[0].name, payload);
            assert.equal(rows[0][fields[0].name], payload);
        });
    };

    const tryEncodingExecute = async (encoding) => {
        specify(`execute ${encoding}`, async () => {
            await connection.execute("set character_set_results = ?", [encoding]);
            const [rows, fields] = await connection.execute("SELECT ? as n", [payload]);

            let iconvEncoding = encoding;
            if (encoding == "utf8mb4") {
                iconvEncoding = "utf8";
            }
            assert.equal(mysql.c.charsetEncoding[fields[0].characterSet], iconvEncoding);
            // TODO: figure out correct metadata encodings setup for binary protocol
            //  assert.equal(fields[0].name, payload);
            assert.equal(rows[0][fields[0].name], payload);
        });
    };

    tryEncoding("cp1251");
    tryEncoding("koi8r");
    tryEncoding("cp866");
    tryEncoding("utf8mb4");
    tryEncodingExecute("cp1251");
    tryEncodingExecute("koi8r");
    tryEncodingExecute("cp866");
    tryEncodingExecute("utf8mb4");
});
