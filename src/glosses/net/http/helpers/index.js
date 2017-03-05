import adone from "adone";

adone.lazify({
    compose: "./compose",
    status: "./statuses",
    Accepts: "./accepts",
    parseURL: "./parse_url",
    isFresh: "./is_fresh",
    contentType: "./content_type",
    mimeType: "./mime_types",
    Negotiator: "./negotiator",
    mediaTyper: "./media_typer",
    typeIs: "./type_is",
    onFinished: "./on_finished",
    isFinished: "./is_finished",
    vary: "./vary",
    escapeHTML: "./escape_html",
    contentDisposition: "./content_disposition",
    assert: "./assert",
    resolvePath: "./resolve_path",
    send: "./send",
    IncomingForm: "./incoming_form"
}, exports, require);
