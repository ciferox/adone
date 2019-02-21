adone.lazify({
    local: "./local",
    level: "./level",
    mongo: "./mongo",
    mysql: "./mysql",
    redis: "./redis",
    orm: "./orm"
    // odm: "./odm",
    //sqlite: "./sqlite" // TODO: add implementation
}, adone.asNamespace(exports), require);
