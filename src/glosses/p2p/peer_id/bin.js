#!/usr/local/bin/node



const PeerId = require("./index.js");

PeerId.create((err, id) => {
    if (err) {
        throw err;
    }

    console.log(JSON.stringify(id.toJSON(), null, 2));
});
