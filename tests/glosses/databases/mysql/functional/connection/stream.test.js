import { createConnection } from "../../common";

describe("glosses", "databases", "mysql", "functional", "connection", "stream", () => {
    let connection = null;
    let sample = null;

    before(async () => {
        connection = await createConnection();
        await connection.query(`
            CREATE TEMPORARY TABLE \`announcements\` (
                \`id\` int(11) NOT NULL AUTO_INCREMENT,
                \`title\` varchar(255) DEFAULT NULL,
                \`text\` varchar(255) DEFAULT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8
        `);
        await connection.query("INSERT INTO announcements(title, text) VALUES(?, ?)", ["Что-то", "Некий предмет, некое явление, нечто."]);
        await connection.query("INSERT INTO announcements(title, text) VALUES(?, ?)", ["Кто-то", "Неизвестно кто, некто."]);
        [sample] = await connection.query("SELECT * FROM announcements");
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    for (const method of ["query", "execute"]) {
        // eslint-disable-next-line
        it(`should stream rows using ${method}`, async () => {
            const s = connection.connection[method]("SELECT * FROM announcements").stream();
            const rows = await new Promise((resolve, reject) => {
                s.once("error", reject);
                const rows = [];
                s.once("end", () => resolve(rows));
                s.on("data", (row) => rows.push(row));
            });
            expect(rows).to.be.deep.equal(sample);
        });
    }
});
