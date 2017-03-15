import { createConnection } from "../../common";

describe("glosses", "databases", "mysql", "functional", "regressions", "views", () => {
    let connection = null;

    const config = {
        table1: "test82t1",
        table2: "test82t2",
        view1: "view82v1",
        view2: "view82v2"
    };

    before(async () => {
        connection = await createConnection();
        await connection.query(`drop table if exists ${config.table1}`);
        await connection.query(`drop table if exists ${config.table2}`);
        await connection.query(`drop view if exists ${config.view1}`);
        await connection.query(`drop view if exists ${config.view2}`);
        await connection.query(`create table ${config.table1} (name1 varchar(20), linkId1 integer(11))`);
        await connection.query(`create table ${config.table2} (name2 varchar(20), linkId2 integer(11))`);
        await connection.query(`insert into ${config.table1} (name1, linkId1) values ("A", 1),("B", 2),("C", 3),("D", 4)`);
        await connection.query(`insert into ${config.table2} (name2, linkId2) values ("AA", 1),("BB", 2),("CC", 3),("DD", 4)`);
        await connection.query(`create view ${config.view1} as select name1, linkId1, name2 from ${config.table1} INNER JOIN ${config.table2} ON linkId1 = linkId2`);
        await connection.query(`create view ${config.view2} as select name1, name2 from ${config.view1}`);
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should not fail", async () => {
        const [rows] = await connection.query(`select * from ${config.view2} order by name2 desc`);
        expect(rows[0].name1).to.be.equal("D");
        expect(rows[1].name1).to.be.equal("C");
        expect(rows[2].name1).to.be.equal("B");
        expect(rows[3].name1).to.be.equal("A");
        expect(rows[0].name2).to.be.equal("DD");
        expect(rows[1].name2).to.be.equal("CC");
        expect(rows[2].name2).to.be.equal("BB");
        expect(rows[3].name2).to.be.equal("AA");
    });
});
