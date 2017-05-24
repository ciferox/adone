const { lazify } = adone;

lazify({
    DKIM: "./dkim",
    MessageParser: "./message_parser",
    RelaxedBody: "./relaxed_body",
    sign: "./sign"
}, exports, require);
