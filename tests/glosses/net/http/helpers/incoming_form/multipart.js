exports.rfc1867 = {
    boundary: "AaB03x",
    raw: [
        "--AaB03x",
        'content-disposition: form-data; name="field1"',
        "",
        "Joe Blow",
        "almost tricked you!",
        "--AaB03x",
        'content-disposition: form-data; name="pics"; filename="file1.txt"',
        "Content-Type: text/plain",
        "",
        "... contents of file1.txt ...\r",
        "--AaB03x--"
    ].join("\r\n"),
    parts: [{
        headers: {
            "content-disposition": 'form-data; name="field1"'
        },
        data: "Joe Blow\r\nalmost tricked you!"
    }, {
        headers: {
            "content-disposition": 'form-data; name="pics"; filename="file1.txt"',
            "Content-Type": "text/plain"
        },
        data: "... contents of file1.txt ...\r"
    }]
};

exports["noTrailing\\r\\n"] = {
    boundary: "AaB03x",
    raw: [
        "--AaB03x",
        'content-disposition: form-data; name="field1"',
        "",
        "Joe Blow",
        "almost tricked you!",
        "--AaB03x",
        'content-disposition: form-data; name="pics"; filename="file1.txt"',
        "Content-Type: text/plain",
        "",
        "... contents of file1.txt ...\r",
        "--AaB03x--"
    ].join("\r\n"),
    parts: [{
        headers: {
            "content-disposition": 'form-data; name="field1"'
        },
        data: "Joe Blow\r\nalmost tricked you!"
    }, {
        headers: {
            "content-disposition": 'form-data; name="pics"; filename="file1.txt"',
            "Content-Type": "text/plain"
        },
        data: "... contents of file1.txt ...\r"
    }]
};

exports.emptyHeader = {
    boundary: "AaB03x",
    raw: [
        "--AaB03x",
        'content-disposition: form-data; name="field1"',
        ": foo",
        "",
        "Joe Blow",
        "almost tricked you!",
        "--AaB03x",
        'content-disposition: form-data; name="pics"; filename="file1.txt"',
        "Content-Type: text/plain",
        "",
        "... contents of file1.txt ...\r",
        "--AaB03x--"
    ].join("\r\n"),
    expectError: true
};
