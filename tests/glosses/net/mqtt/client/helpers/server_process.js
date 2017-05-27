const { MqttServer } = require("../server");

new MqttServer((client) => {
    client.on("connect", () => {
        client.connack({ returnCode: 0 });
    });
}).listen(process.argv[2], "localhost");
