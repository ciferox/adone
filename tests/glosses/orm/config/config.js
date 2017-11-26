

const fs = require("fs");
let mssqlConfig;
try {
    mssqlConfig = JSON.parse(fs.readFileSync(`${__dirname}/mssql.json`, "utf8"));
} catch (e) {
    // ignore
}

module.exports = {
    username: process.env.SEQ_USER || "root",
    password: process.env.SEQ_PW || null,
    database: process.env.SEQ_DB || "sequelize_test",
    host: process.env.SEQ_HOST || "127.0.0.1",
    pool: {
        max: process.env.SEQ_POOL_MAX || 5,
        idle: process.env.SEQ_POOL_IDLE || 30000
    },

    rand() {
        return parseInt(Math.random() * 999, 10);
    },

    mssql: mssqlConfig || {
        database: process.env.MSSQL_DB || "adone_tests",
        username: process.env.MSSQL_USER || "adone",
        password: process.env.MSSQL_PASSWORD || "DIBX85K1usUhKpLqxQJgXrjCWejLNLE4",
        host: process.env.DB_HOST || process.env.MSSQL_HOST || process.env.SEQ_HOST || "127.0.0.1",
        port: process.env.MSSQL_PORT || 1433,
        dialectOptions: {
            // big insert queries need a while
            requestTimeout: 60000
        },
        pool: {
            max: process.env.SEQ_MSSQL_POOL_MAX || process.env.SEQ_POOL_MAX || 5,
            idle: process.env.SEQ_MSSQL_POOL_IDLE || process.env.SEQ_POOL_IDLE || 3000
        }
    },

    // make idle time small so that tests exit promptly
    mysql: {
        database: process.env.MYSQL_DB || "adone_tests",
        username: process.env.MYSQL_USER || "adone",
        password: process.env.MYSQL_PASSWORD || "adone",
        host: process.env.DB_HOST || process.env.MYSQL_HOST || "127.0.0.1",
        port: process.env.MYSQL_PORT || 3306,
        pool: {
            max: process.env.MYSQL_POOL_MAX || 5,
            idle: process.env.MYSQL_POOL_IDLE || 3000
        }
    },

    sqlite: {
    },

    postgres: {
        database: process.env.POSTGRES_DB || "adone_tests",
        username: process.env.POSTGRES_USER || "adone",
        password: process.env.POSTGRES_PASSWORD || "adone",
        host: process.env.DB_HOST || process.env.POSTGRES_HOST || "127.0.0.1",
        port: process.env.POSTGRES_PORT || 5432,
        pool: {
            max: process.env.POSTGRES_POOL_MAX || 5,
            idle: process.env.POSTGRES_POOL_IDLE || 3000
        }
    }
};
