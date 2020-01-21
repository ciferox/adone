adone.lazify({
    level: "./level",
    mysql: "mysql2",
    orm: "typeorm",
    postgresql: "pg",
    sqlite3: "sqlite3"
}, adone.asNamespace(exports), require);
