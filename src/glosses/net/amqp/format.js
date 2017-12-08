const {
    net: { amqp },
    std: {
        util: { format }
    }
} = adone;

const {
    defs,
    frame: { HEARTBEAT }
} = adone.private(amqp);

export const closeMessage = (close) => {
    const code = close.fields.replyCode;
    return format('%d (%s) with message "%s"', code, defs.constant_strs[code], close.fields.replyText);
};

export const methodName = (id) => {
    return defs.info(id).name;
};

export const inspect = (frame, showFields) => {
    if (frame === HEARTBEAT) {
        return "<Heartbeat>";
    } else if (!frame.id) {
        return format("<Content channel:%d size:%d>",
            frame.channel, frame.size);
    }

    const info = defs.info(frame.id);
    return format("<%s channel:%d%s>", info.name, frame.channel,
        (showFields)
            ? ` ${JSON.stringify(frame.fields, undefined, 2)}`
            : "");

};
