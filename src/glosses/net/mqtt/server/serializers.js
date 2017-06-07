export function clientSerializer(client) {
    return client.id;
}

export function packetSerializer(packet) {
    var result = {};

    if (packet.messageId) {
        result.messageId = packet.messageId;
    }

    if (packet.topic) {
        result.topic = packet.topic;
    }

    if (packet.qos) {
        result.qos = packet.qos;
    }

    if (packet.unsubscriptions) {
        result.unsubscriptions = packet.unsubscriptions;
    }

    if (packet.subscriptions) {
        result.subscriptions = packet.subscriptions;
    }

    return result;
}
