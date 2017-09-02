adone.lazify({
    local: "./local",
    level: "./level",
    mysql: "./mysql",
    redis: "./redis",
    mongo: "./mongo",
    pouch: "./pouch"
}, adone.asNamespace(exports), require);
