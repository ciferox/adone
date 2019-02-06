adone.lazify({
    local: "./local",
    level: "./level",
    mongo: "./mongo",
    mysql: "./mysql",
    redis: "./redis",
    //sqlite: "./sqlite" // TODO: add implementation
}, adone.asNamespace(exports), require);
