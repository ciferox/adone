const {
    lazify
} = adone;

lazify({
    Configuration: "./configuration",
    kit: "./kit"
}, adone.asNamespace(exports), require);
