const {
    multiformat: { multibase }
} = adone;
const errcode = require("err-code");

const namespace = "/record/";
const base64urlCode = "u"; // base64url code from multibase

export const encodeBase32 = (buf) => {
    return multibase.encode("base32", buf).slice(1); // slice off multibase codec
};

// converts a binary record key to a pubsub topic key.
export const keyToTopic = (key) => {
    // Record-store keys are arbitrary binary. However, pubsub requires UTF-8 string topic IDs
    // Encodes to "/record/base64url(key)"
    const b64url = multibase.encode("base64url", key).slice(1).toString();

    return `${namespace}${b64url}`;
};

// converts a pubsub topic key to a binary record key.
export const topicToKey = (topic) => {
    if (topic.substring(0, namespace.length) !== namespace) {
        throw errcode(new Error("topic received is not from a record"), "ERR_TOPIC_IS_NOT_FROM_RECORD_NAMESPACE");
    }

    const key = `${base64urlCode}${topic.substring(namespace.length)}`;

    return multibase.decode(key).toString();
};
