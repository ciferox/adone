import { createConnection } from "../../common";

describe("glosses", "databases", "mysql", "functional", "connection", "binary not null nulls", () => {
    const { database: { mysql } } = adone;

    let connection = null;

    before(async () => {
        connection = await createConnection();

        await connection.query('set sql_mode=""');

        await connection.query(`
            CREATE TEMPORARY TABLE \`tmp_account\` (
                \`id\` int(11) NOT NULL AUTO_INCREMENT,
                \`username\` varchar(64) NOT NULL,
                \`auth_code\` varchar(30) NOT NULL,
                \`access_token\` varchar(30) NOT NULL,
                \`refresh_token\` tinytext NOT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8
        `);
        await connection.query("INSERT INTO `tmp_account` VALUES ('1', 'xgredx', '', '', '')");

        await connection.query(`
            CREATE TEMPORARY TABLE \`tmp_account_flags\` (
                 \`account\` int(11) NOT NULL,
                 \`flag\` tinyint(3) NOT NULL,
                 PRIMARY KEY (\`account\`,\`flag\`)
             ) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8
        `);
        await connection.query("INSERT INTO `tmp_account_flags` VALUES ('1', '100')");

        await connection.query(`
            CREATE TEMPORARY TABLE \`tmp_account_session\` (
                 \`account\` int(11) NOT NULL,
                 \`ip\` varchar(15) NOT NULL,
                 \`session\` varchar(114) NOT NULL,
                 \`time\` int(11) NOT NULL,
                 PRIMARY KEY (\`account\`,\`ip\`)
             ) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8
        `);
        await connection.query("INSERT INTO `tmp_account_session` VALUES ('1', '::1', '75efb145482ce22f4544390cad233c749c1b43e4', '1')");

    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should be null", async () => {
        const [rows, fields] = await connection.execute(`
            SELECT \`ac\`.\`username\`, CONCAT('[', GROUP_CONCAT(DISTINCT \`acf\`.\`flag\` SEPARATOR ','), ']') flags
            FROM tmp_account ac
            LEFT JOIN tmp_account_flags acf ON \`acf\`.account = \`ac\`.id
            LEFT JOIN tmp_account_session acs ON \`acs\`.account = \`ac\`.id
            WHERE \`acs\`.\`session\`= ?
        `, [
            "asid=75efb145482ce22f4544390cad233c749c1b43e4"
        ]);

        expect(fields[0].flags & mysql.c.fieldFlag.NOT_NULL).to.be.ok;
        expect(rows[0][fields[0].name]).to.be.null;
    });
});
