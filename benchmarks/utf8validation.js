const {
    is
} = adone;

const utf8Text = Buffer.from("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque gravida mattis rhoncus. Donec iaculis, metus quis varius accumsan, erat mauris condimentum diam, et egestas erat enim ut ligula. Praesent sollicitudin tellus eget dolor euismod euismod. Nullam ac augue nec neque varius luctus. Curabitur elit mi, consequat ultricies adipiscing mollis, scelerisque in erat. Phasellus facilisis fermentum ullamcorper. Nulla et sem eu arcu pharetra pellentesque. Praesent consectetur tempor justo, vel iaculis dui ullamcorper sit amet. Integer tristique viverra ullamcorper. Vivamus laoreet, nulla eget suscipit eleifend, lacus lectus feugiat libero, non fermentum erat nisi at risus. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut pulvinar dignissim tellus, eu dignissim lorem vulputate quis. Morbi ut pulvinar augue.");


const isValidUTF8 = (buf) => {
    const len = buf.length;
    let i = 0;

    while (i < len) {
        if (buf[i] < 0x80) { // 0xxxxxxx
            i++;
        } else if ((buf[i] & 0xe0) === 0xc0) { // 110xxxxx 10xxxxxx
            if (
                i + 1 === len ||
                (buf[i + 1] & 0xc0) !== 0x80 ||
                (buf[i] & 0xfe) === 0xc0 // overlong
            ) {
                return false;
            } 
            i += 2;
            
        } else if ((buf[i] & 0xf0) === 0xe0) { // 1110xxxx 10xxxxxx 10xxxxxx
            if (
                i + 2 >= len ||
                (buf[i + 1] & 0xc0) !== 0x80 ||
                (buf[i + 2] & 0xc0) !== 0x80 ||
                buf[i] === 0xe0 && (buf[i + 1] & 0xe0) === 0x80 || // overlong
                buf[i] === 0xed && (buf[i + 1] & 0xe0) === 0xa0 // surrogate (U+D800 - U+DFFF)
            ) {
                return false;
            } 
            i += 3;
            
        } else if ((buf[i] & 0xf8) === 0xf0) { // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
            if (
                i + 3 >= len ||
                (buf[i + 1] & 0xc0) !== 0x80 ||
                (buf[i + 2] & 0xc0) !== 0x80 ||
                (buf[i + 3] & 0xc0) !== 0x80 ||
                buf[i] === 0xf0 && (buf[i + 1] & 0xf0) === 0x80 || // overlong
                buf[i] === 0xf4 && buf[i + 1] > 0x8f || buf[i] > 0xf4 // > U+10FFFF
            ) {
                return false;
            } 
            i += 4;
        } else {
            return false;
        }
    }

    return true;
};

export default {
    "native"() {
        return adone.net.ws.util.isValidUTF8(utf8Text);
    },
    "fallback"() {
        return isValidUTF8(utf8Text);
    }
};
