// Copyright 2011 Mark Cavage <mcavage@gmail.com> All rights reserved.
import errors from "./errors";
import types from "./types";

import Reader from "./reader";
import Writer from "./writer";

let Ber = {
    Reader,
    Writer
};

for (let t in types) {
    if (types.hasOwnProperty(t))
        Ber[t] = types[t];
}
for (let e in errors) {
    if (errors.hasOwnProperty(e))
        Ber[e] = errors[e];
}

export default Ber;
