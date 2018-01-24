const {
    is
} = adone;

adone.asNamespace(exports);

const SLD = {
    // list of known Second Level Domains
    // converted list of SLDs from https://github.com/gavingmiller/second-level-domains
    // ----
    // publicsuffix.org is more current and actually used by a couple of browsers internally.
    // downside is it also contains domains like "dyndns.org" - which is fine for the security
    // issues browser have to deal with (SOP for cookies, etc) - but is way overboard for URI.js
    // ----
    list: {
        ac: " com gov mil net org ",
        ae: " ac co gov mil name net org pro sch ",
        af: " com edu gov net org ",
        al: " com edu gov mil net org ",
        ao: " co ed gv it og pb ",
        ar: " com edu gob gov int mil net org tur ",
        at: " ac co gv or ",
        au: " asn com csiro edu gov id net org ",
        ba: " co com edu gov mil net org rs unbi unmo unsa untz unze ",
        bb: " biz co com edu gov info net org store tv ",
        bh: " biz cc com edu gov info net org ",
        bn: " com edu gov net org ",
        bo: " com edu gob gov int mil net org tv ",
        br: " adm adv agr am arq art ato b bio blog bmd cim cng cnt com coop ecn edu eng esp etc eti far flog fm fnd fot fst g12 ggf gov imb ind inf jor jus lel mat med mil mus net nom not ntr odo org ppg pro psc psi qsl rec slg srv tmp trd tur tv vet vlog wiki zlg ",
        bs: " com edu gov net org ",
        bz: " du et om ov rg ",
        ca: " ab bc mb nb nf nl ns nt nu on pe qc sk yk ",
        ck: " biz co edu gen gov info net org ",
        cn: " ac ah bj com cq edu fj gd gov gs gx gz ha hb he hi hl hn jl js jx ln mil net nm nx org qh sc sd sh sn sx tj tw xj xz yn zj ",
        co: " com edu gov mil net nom org ",
        cr: " ac c co ed fi go or sa ",
        cy: " ac biz com ekloges gov ltd name net org parliament press pro tm ",
        do: " art com edu gob gov mil net org sld web ",
        dz: " art asso com edu gov net org pol ",
        ec: " com edu fin gov info med mil net org pro ",
        eg: " com edu eun gov mil name net org sci ",
        er: " com edu gov ind mil net org rochest w ",
        es: " com edu gob nom org ",
        et: " biz com edu gov info name net org ",
        fj: " ac biz com info mil name net org pro ",
        fk: " ac co gov net nom org ",
        fr: " asso com f gouv nom prd presse tm ",
        gg: " co net org ",
        gh: " com edu gov mil org ",
        gn: " ac com gov net org ",
        gr: " com edu gov mil net org ",
        gt: " com edu gob ind mil net org ",
        gu: " com edu gov net org ",
        hk: " com edu gov idv net org ",
        hu: " 2000 agrar bolt casino city co erotica erotika film forum games hotel info ingatlan jogasz konyvelo lakas media news org priv reklam sex shop sport suli szex tm tozsde utazas video ",
        id: " ac co go mil net or sch web ",
        il: " ac co gov idf k12 muni net org ",
        in: " ac co edu ernet firm gen gov i ind mil net nic org res ",
        iq: " com edu gov i mil net org ",
        ir: " ac co dnssec gov i id net org sch ",
        it: " edu gov ",
        je: " co net org ",
        jo: " com edu gov mil name net org sch ",
        jp: " ac ad co ed go gr lg ne or ",
        ke: " ac co go info me mobi ne or sc ",
        kh: " com edu gov mil net org per ",
        ki: " biz com de edu gov info mob net org tel ",
        km: " asso com coop edu gouv k medecin mil nom notaires pharmaciens presse tm veterinaire ",
        kn: " edu gov net org ",
        kr: " ac busan chungbuk chungnam co daegu daejeon es gangwon go gwangju gyeongbuk gyeonggi gyeongnam hs incheon jeju jeonbuk jeonnam k kg mil ms ne or pe re sc seoul ulsan ",
        kw: " com edu gov net org ",
        ky: " com edu gov net org ",
        kz: " com edu gov mil net org ",
        lb: " com edu gov net org ",
        lk: " assn com edu gov grp hotel int ltd net ngo org sch soc web ",
        lr: " com edu gov net org ",
        lv: " asn com conf edu gov id mil net org ",
        ly: " com edu gov id med net org plc sch ",
        ma: " ac co gov m net org press ",
        mc: " asso tm ",
        me: " ac co edu gov its net org priv ",
        mg: " com edu gov mil nom org prd tm ",
        mk: " com edu gov inf name net org pro ",
        ml: " com edu gov net org presse ",
        mn: " edu gov org ",
        mo: " com edu gov net org ",
        mt: " com edu gov net org ",
        mv: " aero biz com coop edu gov info int mil museum name net org pro ",
        mw: " ac co com coop edu gov int museum net org ",
        mx: " com edu gob net org ",
        my: " com edu gov mil name net org sch ",
        nf: " arts com firm info net other per rec store web ",
        ng: " biz com edu gov mil mobi name net org sch ",
        ni: " ac co com edu gob mil net nom org ",
        np: " com edu gov mil net org ",
        nr: " biz com edu gov info net org ",
        om: " ac biz co com edu gov med mil museum net org pro sch ",
        pe: " com edu gob mil net nom org sld ",
        ph: " com edu gov i mil net ngo org ",
        pk: " biz com edu fam gob gok gon gop gos gov net org web ",
        pl: " art bialystok biz com edu gda gdansk gorzow gov info katowice krakow lodz lublin mil net ngo olsztyn org poznan pwr radom slupsk szczecin torun warszawa waw wroc wroclaw zgora ",
        pr: " ac biz com edu est gov info isla name net org pro prof ",
        ps: " com edu gov net org plo sec ",
        pw: " belau co ed go ne or ",
        ro: " arts com firm info nom nt org rec store tm www ",
        rs: " ac co edu gov in org ",
        sb: " com edu gov net org ",
        sc: " com edu gov net org ",
        sh: " co com edu gov net nom org ",
        sl: " com edu gov net org ",
        st: " co com consulado edu embaixada gov mil net org principe saotome store ",
        sv: " com edu gob org red ",
        sz: " ac co org ",
        tr: " av bbs bel biz com dr edu gen gov info k12 name net org pol tel tsk tv web ",
        tt: " aero biz cat co com coop edu gov info int jobs mil mobi museum name net org pro tel travel ",
        tw: " club com ebiz edu game gov idv mil net org ",
        mu: " ac co com gov net or org ",
        mz: " ac co edu gov org ",
        na: " co com ",
        nz: " ac co cri geek gen govt health iwi maori mil net org parliament school ",
        pa: " abo ac com edu gob ing med net nom org sld ",
        pt: " com edu gov int net nome org publ ",
        py: " com edu gov mil net org ",
        qa: " com edu gov mil net org ",
        re: " asso com nom ",
        ru: " ac adygeya altai amur arkhangelsk astrakhan bashkiria belgorod bir bryansk buryatia cbg chel chelyabinsk chita chukotka chuvashia com dagestan e-burg edu gov grozny int irkutsk ivanovo izhevsk jar joshkar-ola kalmykia kaluga kamchatka karelia kazan kchr kemerovo khabarovsk khakassia khv kirov koenig komi kostroma kranoyarsk kuban kurgan kursk lipetsk magadan mari mari-el marine mil mordovia mosreg msk murmansk nalchik net nnov nov novosibirsk nsk omsk orenburg org oryol penza perm pp pskov ptz rnd ryazan sakhalin samara saratov simbirsk smolensk spb stavropol stv surgut tambov tatarstan tom tomsk tsaritsyn tsk tula tuva tver tyumen udm udmurtia ulan-ude vladikavkaz vladimir vladivostok volgograd vologda voronezh vrn vyatka yakutia yamal yekaterinburg yuzhno-sakhalinsk ",
        rw: " ac co com edu gouv gov int mil net ",
        sa: " com edu gov med net org pub sch ",
        sd: " com edu gov info med net org tv ",
        se: " a ac b bd c d e f g h i k l m n o org p parti pp press r s t tm u w x y z ",
        sg: " com edu gov idn net org per ",
        sn: " art com edu gouv org perso univ ",
        sy: " com edu gov mil net news org ",
        th: " ac co go in mi net or ",
        tj: " ac biz co com edu go gov info int mil name net nic org test web ",
        tn: " agrinet com defense edunet ens fin gov ind info intl mincom nat net org perso rnrt rns rnu tourism ",
        tz: " ac co go ne or ",
        ua: " biz cherkassy chernigov chernovtsy ck cn co com crimea cv dn dnepropetrovsk donetsk dp edu gov if in ivano-frankivsk kh kharkov kherson khmelnitskiy kiev kirovograd km kr ks kv lg lugansk lutsk lviv me mk net nikolaev od odessa org pl poltava pp rovno rv sebastopol sumy te ternopil uzhgorod vinnica vn zaporizhzhe zhitomir zp zt ",
        ug: " ac co go ne or org sc ",
        uk: " ac bl british-library co cym gov govt icnet jet lea ltd me mil mod national-library-scotland nel net nhs nic nls org orgn parliament plc police sch scot soc ",
        us: " dni fed isa kids nsn ",
        uy: " com edu gub mil net org ",
        ve: " co com edu gob info mil net org web ",
        vi: " co com k12 net org ",
        vn: " ac biz com edu gov health info int name net org pro ",
        ye: " co com gov ltd me net org plc ",
        yu: " ac co edu gov org ",
        za: " ac agric alt bourse city co cybernet db edu gov grondar iaccess imt inca landesign law mil net ngo nis nom olivetti org pix school tm web ",
        zm: " ac co com edu gov net org sch ",
        // https://en.wikipedia.org/wiki/CentralNic#Second-level_domains
        com: "ar br cn de eu gb gr hu jpn kr no qc ru sa se uk us uy za ",
        net: "gb jp se uk ",
        org: "ae",
        de: "com "
    },
    // gorhill 2013-10-25: Using indexOf() instead Regexp(). Significant boost
    // in both performance and memory footprint. No initialization required.
    // http://jsperf.com/uri-js-sld-regex-vs-binary-search/4
    // Following methods use lastIndexOf() rather than array.split() in order
    // to avoid any memory allocations.
    has(domain) {
        const tldOffset = domain.lastIndexOf(".");
        if (tldOffset <= 0 || tldOffset >= (domain.length - 1)) {
            return false;
        }
        const sldOffset = domain.lastIndexOf(".", tldOffset - 1);
        if (sldOffset <= 0 || sldOffset >= (tldOffset - 1)) {
            return false;
        }
        const sldList = SLD.list[domain.slice(tldOffset + 1)];
        if (!sldList) {
            return false;
        }
        return sldList.indexOf(` ${domain.slice(sldOffset + 1, tldOffset)} `) >= 0;
    },
    is(domain) {
        const tldOffset = domain.lastIndexOf(".");
        if (tldOffset <= 0 || tldOffset >= (domain.length - 1)) {
            return false;
        }
        const sldOffset = domain.lastIndexOf(".", tldOffset - 1);
        if (sldOffset >= 0) {
            return false;
        }
        const sldList = SLD.list[domain.slice(tldOffset + 1)];
        if (!sldList) {
            return false;
        }
        return sldList.indexOf(` ${domain.slice(0, tldOffset)} `) >= 0;
    },
    get(domain) {
        const tldOffset = domain.lastIndexOf(".");
        if (tldOffset <= 0 || tldOffset >= (domain.length - 1)) {
            return null;
        }
        const sldOffset = domain.lastIndexOf(".", tldOffset - 1);
        if (sldOffset <= 0 || sldOffset >= (tldOffset - 1)) {
            return null;
        }
        const sldList = SLD.list[domain.slice(tldOffset + 1)];
        if (!sldList) {
            return null;
        }
        if (sldList.indexOf(` ${domain.slice(sldOffset + 1, tldOffset)} `) < 0) {
            return null;
        }
        return domain.slice(sldOffset + 1);
    }
};

const IPv6 = {
    best(address) {
        // based on:
        // Javascript to test an IPv6 address for proper format, and to
        // present the "best text representation" according to IETF Draft RFC at
        // http://tools.ietf.org/html/draft-ietf-6man-text-addr-representation-04
        // 8 Feb 2010 Rich Brown, Dartware, LLC
        // Please feel free to use this code as long as you provide a link to
        // http://www.intermapper.com
        // http://intermapper.com/support/tools/IPV6-Validator.aspx
        // http://download.dartware.com/thirdparty/ipv6validator.js

        const _address = address.toLowerCase();
        const segments = _address.split(":");
        let length = segments.length;
        let total = 8;

        // trim colons (:: or ::a:b:c… or …a:b:c::)
        if (segments[0] === "" && segments[1] === "" && segments[2] === "") {
            // must have been ::
            // remove first two items
            segments.shift();
            segments.shift();
        } else if (segments[0] === "" && segments[1] === "") {
            // must have been ::xxxx
            // remove the first item
            segments.shift();
        } else if (segments[length - 1] === "" && segments[length - 2] === "") {
            // must have been xxxx::
            segments.pop();
        }

        length = segments.length;

        // adjust total segments for IPv4 trailer
        if (segments[length - 1].indexOf(".") !== -1) {
            // found a "." which means IPv4
            total = 7;
        }

        // fill empty segments them with "0000"
        let pos;
        for (pos = 0; pos < length; pos++) {
            if (segments[pos] === "") {
                break;
            }
        }

        if (pos < total) {
            segments.splice(pos, 1, "0000");
            while (segments.length < total) {
                segments.splice(pos, 0, "0000");
            }
        }

        // strip leading zeros
        let _segments;
        for (let i = 0; i < total; i++) {
            _segments = segments[i].split("");
            for (let j = 0; j < 3; j++) {
                if (_segments[0] === "0" && _segments.length > 1) {
                    _segments.splice(0, 1);
                } else {
                    break;
                }
            }

            segments[i] = _segments.join("");
        }

        // find longest sequence of zeroes and coalesce them into one segment
        let best = -1;
        let _best = 0;
        let _current = 0;
        let current = -1;
        let inzeroes = false;
        // i; already declared

        for (let i = 0; i < total; i++) {
            if (inzeroes) {
                if (segments[i] === "0") {
                    _current += 1;
                } else {
                    inzeroes = false;
                    if (_current > _best) {
                        best = current;
                        _best = _current;
                    }
                }
            } else {
                if (segments[i] === "0") {
                    inzeroes = true;
                    current = i;
                    _current = 1;
                }
            }
        }

        if (_current > _best) {
            best = current;
            _best = _current;
        }

        if (_best > 1) {
            segments.splice(best, _best, "");
        }

        length = segments.length;

        // assemble remaining segments
        let result = "";
        if (segments[0] === "") {
            result = ":";
        }

        for (let i = 0; i < length; i++) {
            result += segments[i];
            if (i === length - 1) {
                break;
            }

            result += ":";
        }

        if (segments[length - 1] === "") {
            result += ":";
        }

        return result;
    }
};

const isInteger = (value) => /^[0-9]+$/.test(value);

const hasOwn = Object.prototype.hasOwnProperty;

// https://github.com/medialize/URI.js/commit/85ac21783c11f8ccab06106dba9735a31a86924d#commitcomment-821963
const escapeRegEx = (string) => string.replace(/([.*+?^=!:${}()|[\]\/\\])/g, "\\$1");

const getType = (value) => {
    // IE8 doesn't return [Object Undefined] but [Object Object] for undefined value
    if (is.undefined(value)) {
        return "Undefined";
    }

    return String(Object.prototype.toString.call(value)).slice(8, -1);
};

const isArray = (obj) => getType(obj) === "Array";

const filterArrayValues = (data, value) => {
    let lookup = {};
    let i;
    let length;

    if (getType(value) === "RegExp") {
        lookup = null;
    } else if (isArray(value)) {
        for (i = 0, length = value.length; i < length; i++) {
            lookup[value[i]] = true;
        }
    } else {
        lookup[value] = true;
    }

    for (i = 0, length = data.length; i < length; i++) {
        /*jshint laxbreak: true */
        const _match = lookup && !is.undefined(lookup[data[i]])
            || !lookup && value.test(data[i]);
        /*jshint laxbreak: false */
        if (_match) {
            data.splice(i, 1);
            length--;
            i--;
        }
    }

    return data;
};

const arrayContains = (list, value) => {
    let i;
    let length;

    // value may be string, number, array, regexp
    if (isArray(value)) {
        // Note: this can be optimized to O(n) (instead of current O(m * n))
        for (i = 0, length = value.length; i < length; i++) {
            if (!arrayContains(list, value[i])) {
                return false;
            }
        }

        return true;
    }

    const _type = getType(value);
    for (i = 0, length = list.length; i < length; i++) {
        if (_type === "RegExp") {
            if (is.string(list[i]) && list[i].match(value)) {
                return true;
            }
        } else if (list[i] === value) {
            return true;
        }
    }

    return false;
};

const arraysEqual = (one, two) => {
    if (!isArray(one) || !isArray(two)) {
        return false;
    }

    // arrays can't be equal if they have different amount of content
    if (one.length !== two.length) {
        return false;
    }

    one.sort();
    two.sort();

    for (let i = 0, l = one.length; i < l; i++) {
        if (one[i] !== two[i]) {
            return false;
        }
    }

    return true;
};

const trimSlashes = (text) => {
    const trimExpression = /^\/+|\/+$/g;
    return text.replace(trimExpression, "");
};

// https://github.com/medialize/URI.js/issues/91
const escapeForDumbFirefox36 = (value) => escape(value);

// encoding / decoding according to RFC3986
// see https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/encodeURIComponent
const strictEncodeURIComponent = (string) => encodeURIComponent(string)
    .replace(/[!'()*]/g, escapeForDumbFirefox36)
    .replace(/\*/g, "%2A");


export let encode = strictEncodeURIComponent;
export let decode = decodeURIComponent;

export const parseUserinfo = function (string, parts) {
    // extract username:password
    const firstSlash = string.indexOf("/");
    const pos = string.lastIndexOf("@", firstSlash > -1 ? firstSlash : string.length - 1);
    let t;

    // authority@ must come before /path
    if (pos > -1 && (firstSlash === -1 || pos < firstSlash)) {
        t = string.substring(0, pos).split(":");
        parts.username = t[0] ? decode(t[0]) : null;
        t.shift();
        parts.password = t[0] ? decode(t.join(":")) : null;
        string = string.substring(pos + 1);
    } else {
        parts.username = null;
        parts.password = null;
    }

    return string;
};

// list of protocols which always require a hostname
const hostProtocols = [
    "http",
    "https"
];

// allowed hostname characters according to RFC 3986
// ALPHA DIGIT "-" "." "_" "~" "!" "$" "&" "'" "(" ")" "*" "+" "," ";" "=" %encoded
// I've never seen a (non-IDN) hostname other than: ALPHA DIGIT . - _
const invalid_hostname_characters = /[^a-zA-Z0-9\.\-:_]/;

export const ensureValidHostname = function (v, protocol) {
    // Theoretically URIs allow percent-encoding in Hostnames (according to RFC 3986)
    // they are not part of DNS and therefore ignored by URI.js

    const hasHostname = Boolean(v); // not null and not an empty string
    const hasProtocol = Boolean(protocol);
    let rejectEmptyHostname = false;

    if (hasProtocol) {
        rejectEmptyHostname = arrayContains(hostProtocols, protocol);
    }

    if (rejectEmptyHostname && !hasHostname) {
        throw new TypeError(`Hostname cannot be empty, if protocol is ${protocol}`);
    } else if (v && v.match(invalid_hostname_characters)) {
        if (adone.punycode.toASCII(v).match(invalid_hostname_characters)) {
            throw new TypeError(`Hostname "${v}" contains characters other than [A-Z0-9.-:_]`);
        }
    }
};

export const ensureValidPort = function (v) {
    if (!v) {
        return;
    }

    const port = Number(v);
    if (isInteger(port) && (port > 0) && (port < 65536)) {
        return;
    }

    throw new TypeError(`Port "${v}" is not a valid port`);
};

export const parseHost = function (string, parts) {
    if (!string) {
        string = "";
    }

    // Copy chrome, IE, opera backslash-handling behavior.
    // Back slashes before the query string get converted to forward slashes
    // See: https://github.com/joyent/node/blob/386fd24f49b0e9d1a8a076592a404168faeecc34/lib/url.js#L115-L124
    // See: https://code.google.com/p/chromium/issues/detail?id=25916
    // https://github.com/medialize/URI.js/pull/233
    string = string.replace(/\\/g, "/");

    // extract host:port
    let pos = string.indexOf("/");
    let bracketPos;
    let t;

    if (pos === -1) {
        pos = string.length;
    }

    if (string.charAt(0) === "[") {
        // IPv6 host - http://tools.ietf.org/html/draft-ietf-6man-text-addr-representation-04#section-6
        // I claim most client software breaks on IPv6 anyways. To simplify things, URI only accepts
        // IPv6+port in the format [2001:db8::1]:80 (for the time being)
        bracketPos = string.indexOf("]");
        parts.hostname = string.substring(1, bracketPos) || null;
        parts.port = string.substring(bracketPos + 2, pos) || null;
        if (parts.port === "/") {
            parts.port = null;
        }
    } else {
        const firstColon = string.indexOf(":");
        const firstSlash = string.indexOf("/");
        const nextColon = string.indexOf(":", firstColon + 1);
        if (nextColon !== -1 && (firstSlash === -1 || nextColon < firstSlash)) {
            // IPv6 host contains multiple colons - but no port
            // this notation is actually not allowed by RFC 3986, but we're a liberal parser
            parts.hostname = string.substring(0, pos) || null;
            parts.port = null;
        } else {
            t = string.substring(0, pos).split(":");
            parts.hostname = t[0] || null;
            parts.port = t[1] || null;
        }
    }

    if (parts.hostname && string.substring(pos).charAt(0) !== "/") {
        pos++;
        string = `/${string}`;
    }

    if (parts.preventInvalidHostname) {
        ensureValidHostname(parts.hostname, parts.protocol);
    }

    if (parts.port) {
        ensureValidPort(parts.port);
    }

    return string.substring(pos) || "/";
};

export const parseAuthority = (string, parts) => parseHost(parseUserinfo(string, parts), parts);

export const parse = function (string, parts) {
    let pos;
    if (!parts) {
        parts = {
            preventInvalidHostname: URI.preventInvalidHostname
        };
    }
    // [protocol"://"[username[":"password]"@"]hostname[":"port]"/"?][path]["?"querystring]["#"fragment]

    // extract fragment
    pos = string.indexOf("#");
    if (pos > -1) {
        // escaping?
        parts.fragment = string.substring(pos + 1) || null;
        string = string.substring(0, pos);
    }

    // extract query
    pos = string.indexOf("?");
    if (pos > -1) {
        // escaping?
        parts.query = string.substring(pos + 1) || null;
        string = string.substring(0, pos);
    }

    // extract protocol
    if (string.substring(0, 2) === "//") {
        // relative-scheme
        parts.protocol = null;
        string = string.substring(2);
        // extract "user:pass@host:port"
        string = parseAuthority(string, parts);
    } else {
        pos = string.indexOf(":");
        if (pos > -1) {
            parts.protocol = string.substring(0, pos) || null;
            if (parts.protocol && !parts.protocol.match(adone.regex.protocol())) {
                // : may be within the path
                parts.protocol = undefined;
            } else if (string.substring(pos + 1, pos + 3) === "//") {
                string = string.substring(pos + 3);

                // extract "user:pass@host:port"
                string = parseAuthority(string, parts);
            } else {
                string = string.substring(pos + 1);
                parts.urn = true;
            }
        }
    }

    // what's left must be the path
    parts.path = string;

    // and we're done
    return parts;
};

export const encodeQuery = function (string, escapeQuerySpace) {
    const escaped = encode(`${string}`);
    if (is.undefined(escapeQuerySpace)) {
        escapeQuerySpace = URI.escapeQuerySpace;
    }

    return escapeQuerySpace ? escaped.replace(/%20/g, "+") : escaped;
};

export const decodeQuery = function (string, escapeQuerySpace) {
    string = String(string);
    if (is.undefined(escapeQuerySpace)) {
        escapeQuerySpace = URI.escapeQuerySpace;
    }

    try {
        return decode(escapeQuerySpace ? string.replace(/\+/g, "%20") : string);
    } catch (e) {
        // we're not going to mess with weird encodings,
        // give up and return the undecoded original string
        // see https://github.com/medialize/URI.js/issues/87
        // see https://github.com/medialize/URI.js/issues/92
        return string;
    }
};

export const parseQuery = function (string, escapeQuerySpace) {
    if (!string) {
        return {};
    }

    // throw out the funky business - "?"[name"="value"&"]+
    string = string.replace(/&+/g, "&").replace(/^\?*&*|&+$/g, "");

    if (!string) {
        return {};
    }

    const items = {};
    const splits = string.split("&");
    const length = splits.length;
    let v;
    let name;
    let value;

    for (let i = 0; i < length; i++) {
        v = splits[i].split("=");
        name = decodeQuery(v.shift(), escapeQuerySpace);
        // no "=" is null according to http://dvcs.w3.org/hg/url/raw-file/tip/Overview.html#collect-url-parameters
        value = v.length ? decodeQuery(v.join("="), escapeQuerySpace) : null;

        if (hasOwn.call(items, name)) {
            if (is.string(items[name]) || is.null(items[name])) {
                items[name] = [items[name]];
            }

            items[name].push(value);
        } else {
            items[name] = value;
        }
    }

    return items;
};

export const buildUserinfo = function (parts) {
    let t = "";

    if (parts.username) {
        t += encode(parts.username);
    }

    if (parts.password) {
        t += `:${encode(parts.password)}`;
    }

    if (t) {
        t += "@";
    }

    return t;
};

export const buildHost = function (parts) {
    let t = "";

    if (!parts.hostname) {
        return "";
    } else if (adone.regex.ip6().test(parts.hostname)) {
        t += `[${parts.hostname}]`;
    } else {
        t += parts.hostname;
    }

    if (parts.port) {
        t += `:${parts.port}`;
    }

    return t;
};

export const buildAuthority = (parts) => buildUserinfo(parts) + buildHost(parts);

export const build = function (parts) {
    let t = "";

    if (parts.protocol) {
        t += `${parts.protocol}:`;
    }

    if (!parts.urn && (t || parts.hostname)) {
        t += "//";
    }

    t += (buildAuthority(parts) || "");

    if (is.string(parts.path)) {
        if (parts.path.charAt(0) !== "/" && is.string(parts.hostname)) {
            t += "/";
        }

        t += parts.path;
    }

    if (is.string(parts.query) && parts.query) {
        t += `?${parts.query}`;
    }

    if (is.string(parts.fragment) && parts.fragment) {
        t += `#${parts.fragment}`;
    }
    return t;
};

// http://www.w3.org/TR/REC-html40/interact/forms.html#form-content-type -- application/x-www-form-urlencoded
// don't append "=" for null values, according to http://dvcs.w3.org/hg/url/raw-file/tip/Overview.html#url-parameter-serialization
const buildQueryParameter = (name, value, escapeQuerySpace) => encodeQuery(name, escapeQuerySpace) + (!is.null(value) ? `=${encodeQuery(value, escapeQuerySpace)}` : "");

export const buildQuery = function (data, duplicateQueryParameters, escapeQuerySpace) {
    // according to http://tools.ietf.org/html/rfc3986 or http://labs.apache.org/webarch/uri/rfc/rfc3986.html
    // being »-._~!$&'()*+,;=:@/?« %HEX and alnum are allowed
    // the RFC explicitly states ?/foo being a valid use case, no mention of parameter syntax!
    // URI.js treats the query string as being application/x-www-form-urlencoded
    // see http://www.w3.org/TR/REC-html40/interact/forms.html#form-content-type

    let t = "";
    let unique;
    let key;
    let i;
    let length;
    for (key in data) {
        if (hasOwn.call(data, key) && key) {
            if (isArray(data[key])) {
                unique = {};
                for (i = 0, length = data[key].length; i < length; i++) {
                    if (!is.undefined(data[key][i]) && is.undefined(unique[String(data[key][i])])) {
                        t += `&${buildQueryParameter(key, data[key][i], escapeQuerySpace)}`;
                        if (duplicateQueryParameters !== true) {
                            unique[String(data[key][i])] = true;
                        }
                    }
                }
            } else if (!is.undefined(data[key])) {
                t += `&${buildQueryParameter(key, data[key], escapeQuerySpace)}`;
            }
        }
    }

    return t.substring(1);
};

export const addQuery = function (data, name, value) {
    if (typeof name === "object") {
        for (const key in name) {
            if (hasOwn.call(name, key)) {
                addQuery(data, key, name[key]);
            }
        }
    } else if (is.string(name)) {
        if (is.undefined(data[name])) {
            data[name] = value;
            return;
        } else if (is.string(data[name])) {
            data[name] = [data[name]];
        }

        if (!isArray(value)) {
            value = [value];
        }

        data[name] = (data[name] || []).concat(value);
    } else {
        throw new TypeError("addQuery() accepts an object, string as the name parameter");
    }
};

export const setQuery = function (data, name, value) {
    if (typeof name === "object") {
        for (const key in name) {
            if (hasOwn.call(name, key)) {
                setQuery(data, key, name[key]);
            }
        }
    } else if (is.string(name)) {
        data[name] = is.undefined(value) ? null : value;
    } else {
        throw new TypeError("setQuery() accepts an object, string as the name parameter");
    }
};

export const removeQuery = function (data, name, value) {
    let i;
    let length;
    let key;

    if (isArray(name)) {
        for (i = 0, length = name.length; i < length; i++) {
            data[name[i]] = undefined;
        }
    } else if (getType(name) === "RegExp") {
        for (key in data) {
            if (name.test(key)) {
                data[key] = undefined;
            }
        }
    } else if (typeof name === "object") {
        for (key in name) {
            if (hasOwn.call(name, key)) {
                removeQuery(data, key, name[key]);
            }
        }
    } else if (is.string(name)) {
        if (!is.undefined(value)) {
            if (getType(value) === "RegExp") {
                if (!isArray(data[name]) && value.test(data[name])) {
                    data[name] = undefined;
                } else {
                    data[name] = filterArrayValues(data[name], value);
                }
            } else if (data[name] === String(value) && (!isArray(value) || value.length === 1)) {
                data[name] = undefined;
            } else if (isArray(data[name])) {
                data[name] = filterArrayValues(data[name], value);
            }
        } else {
            data[name] = undefined;
        }
    } else {
        throw new TypeError("removeQuery() accepts an object, string, RegExp as the first parameter");
    }
};

export const hasQuery = function (data, name, value, withinArray) {
    switch (getType(name)) {
        case "String":
            // Nothing to do here
            break;

        case "RegExp":
            for (const key in data) {
                if (hasOwn.call(data, key)) {
                    if (name.test(key) && (is.undefined(value) || hasQuery(data, key, value))) {
                        return true;
                    }
                }
            }

            return false;

        case "Object":
            for (const _key in name) {
                if (hasOwn.call(name, _key)) {
                    if (!hasQuery(data, _key, name[_key])) {
                        return false;
                    }
                }
            }

            return true;

        default:
            throw new TypeError("hasQuery() accepts a string, regular expression or object as the name parameter");
    }

    switch (getType(value)) {
        case "Undefined":
            // true if exists (but may be empty)
            return name in data; // data[name] !== undefined;

        case "Boolean": {
            // true if exists and non-empty
            const _booly = Boolean(isArray(data[name]) ? data[name].length : data[name]);
            return value === _booly;
        }
        case "Function":
            // allow complex comparison
            return Boolean(value(data[name], name, data));

        case "Array": {
            if (!isArray(data[name])) {
                return false;
            }

            const op = withinArray ? arrayContains : arraysEqual;
            return op(data[name], value);
        }
        case "RegExp":
            if (!isArray(data[name])) {
                return Boolean(data[name] && data[name].match(value));
            }

            if (!withinArray) {
                return false;
            }

            return arrayContains(data[name], value);

        case "Number":
            value = String(value);
        /* falls through */
        case "String":
            if (!isArray(data[name])) {
                return data[name] === value;
            }

            if (!withinArray) {
                return false;
            }

            return arrayContains(data[name], value);

        default:
            throw new TypeError("hasQuery() accepts undefined, boolean, string, number, RegExp, Function as the value parameter");
    }
};

export const joinPaths = function () {
    const input = [];
    const segments = [];
    let nonEmptySegments = 0;

    for (let i = 0; i < arguments.length; i++) {
        const url = new URI(arguments[i]);
        input.push(url);
        const _segments = url.segment();
        for (let s = 0; s < _segments.length; s++) {
            if (is.string(_segments[s])) {
                segments.push(_segments[s]);
            }

            if (_segments[s]) {
                nonEmptySegments++;
            }
        }
    }

    if (!segments.length || !nonEmptySegments) {
        return new URI("");
    }

    const uri = new URI("").segment(segments);

    if (input[0].path() === "" || input[0].path().slice(0, 1) === "/") {
        uri.path(`/${uri.path()}`);
    }

    return uri.normalize();
};

export const commonPath = function (one, two) {
    const length = Math.min(one.length, two.length);
    let pos;

    // find first non-matching character
    for (pos = 0; pos < length; pos++) {
        if (one.charAt(pos) !== two.charAt(pos)) {
            pos--;
            break;
        }
    }

    if (pos < 1) {
        return one.charAt(0) === two.charAt(0) && one.charAt(0) === "/" ? "/" : "";
    }

    // revert to last /
    if (one.charAt(pos) !== "/" || two.charAt(pos) !== "/") {
        pos = one.substring(0, pos).lastIndexOf("/");
    }

    return one.substring(0, pos + 1);
};


export class URI {
    constructor(url, base) {
        const _urlSupplied = arguments.length >= 1;
        const _baseSupplied = arguments.length >= 2;

        // Allow instantiation without the 'new' keyword
        if (!(this instanceof URI)) {
            if (_urlSupplied) {
                if (_baseSupplied) {
                    return new URI(url, base);
                }

                return new URI(url);
            }

            return new URI();
        }

        if (is.undefined(url)) {
            if (_urlSupplied) {
                throw new TypeError("undefined is not a valid argument for URI");
            }

            url = "";
        }

        if (is.null(url)) {
            if (_urlSupplied) {
                throw new TypeError("null is not a valid argument for URI");
            }
        }

        this.href(url);

        // resolve to base according to http://dvcs.w3.org/hg/url/raw-file/tip/Overview.html#constructor
        if (!is.undefined(base)) {
            return this.absoluteTo(base);
        }

        return this;
    }

    build(deferBuild) {
        if (deferBuild === true) {
            this._deferred_build = true;
        } else if (is.undefined(deferBuild) || this._deferred_build) {
            this._string = build(this._parts);
            this._deferred_build = false;
        }

        return this;
    }

    clone() {
        return new URI(this);
    }

    toString() {
        return this.build(false)._string;
    }

    protocol(v, build) {
        if (v) {
            // accept trailing ://
            v = v.replace(/:(\/\/)?$/, "");

            if (!v.match(adone.regex.protocol())) {
                throw new TypeError(`Protocol "${v}" contains characters other than [A-Z0-9.+-] or doesn't start with [A-Z]`);
            }
        }

        if (is.undefined(v)) {
            return this._parts.protocol || "";
        }

        this._parts.protocol = v || null;
        this.build(!build);
        return this;
    }

    scheme(v, build) {
        return this.protocol(v, build);
    }

    username(v, build) {
        if (is.undefined(v)) {
            return this._parts.username || "";
        }
        this._parts.username = v || null;
        this.build(!build);
        return this;
    }

    password(v, build) {
        if (is.undefined(v)) {
            return this._parts.password || "";
        }
        this._parts.password = v || null;
        this.build(!build);
        return this;
    }

    hostname(v, build) {
        if (this._parts.urn) {
            return is.undefined(v) ? "" : this;
        }

        if (!is.undefined(v)) {
            const x = { preventInvalidHostname: this._parts.preventInvalidHostname };
            const res = parseHost(v, x);
            if (res !== "/") {
                throw new TypeError(`Hostname "${v}" contains characters other than [A-Z0-9.-]`);
            }

            v = x.hostname;
            if (this._parts.preventInvalidHostname) {
                ensureValidHostname(v, this._parts.protocol);
            }
        }

        if (is.undefined(v)) {
            return this._parts.hostname || "";
        }

        this._parts.hostname = v || null;
        this.build(!build);
        return this;
    }

    port(v, build) {
        if (this._parts.urn) {
            return is.undefined(v) ? "" : this;
        }

        if (!is.undefined(v)) {
            if (v === 0) {
                v = null;
            }

            if (v) {
                v = String(v);
                if (v.charAt(0) === ":") {
                    v = v.substring(1);
                }

                ensureValidPort(v);
            }
        }

        if (is.undefined(v)) {
            return this._parts.port || "";
        }

        this._parts.port = v || null;
        this.build(!build);
        return this;
    }

    query(v, build) {
        if (v === true) {
            return parseQuery(this._parts.query, this._parts.escapeQuerySpace);
        } else if (is.function(v)) {
            const data = parseQuery(this._parts.query, this._parts.escapeQuerySpace);
            const result = v.call(this, data);
            this._parts.query = buildQuery(result || data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
            this.build(!build);
            return this;
        } else if (!is.undefined(v) && !is.string(v)) {
            this._parts.query = buildQuery(v, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
            this.build(!build);
            return this;
        }

        if (is.undefined(v)) {
            return this._parts.query || "";
        }
        if (!is.null(v)) {
            v = String(v);
            if (v.charAt(0) === "?") {
                v = v.substring(1);
            }
        }

        this._parts.query = v;
        this.build(!build);
        return this;
    }

    fragment(v, build) {
        if (is.undefined(v)) {
            return this._parts.fragment || "";
        }
        if (!is.null(v)) {
            v = String(v);
            if (v.charAt(0) === "#") {
                v = v.substring(1);
            }
        }

        this._parts.fragment = v;
        this.build(!build);
        return this;
    }

    search(v, build) {
        const t = this.query(v, build);
        return is.string(t) && t.length ? (`?${t}`) : t;
    }

    hash(v, build) {
        const t = this.fragment(v, build);
        return is.string(t) && t.length ? (`#${t}`) : t;
    }

    pathname(v, build) {
        if (is.undefined(v) || v === true) {
            const res = this._parts.path || (this._parts.hostname ? "/" : "");
            return v ? (this._parts.urn ? exports.decodeUrnPath : exports.decodePath)(res) : res;
        }
        if (this._parts.urn) {
            this._parts.path = v ? exports.recodeUrnPath(v) : "";
        } else {
            this._parts.path = v ? exports.recodePath(v) : "/";
        }
        this.build(!build);
        return this;
    }

    path(v, build) {
        return this.pathname(v, build);
    }

    href(href, build) {
        let key;

        if (is.undefined(href)) {
            return this.toString();
        }

        this._string = "";
        this._parts = URI._parts();

        const _URI = href instanceof URI;
        let _object = typeof href === "object" && (href.hostname || href.path || href.pathname);
        if (href.nodeName) {
            const attribute = URI.getDomAttribute(href);
            href = href[attribute] || "";
            _object = false;
        }

        // window.location is reported to be an object, but it's not the sort
        // of object we're looking for:
        // * location.protocol ends with a colon
        // * location.query != object.search
        // * location.hash != object.fragment
        // simply serializing the unknown object should do the trick
        // (for location, not for everything...)
        if (!_URI && _object && !is.undefined(href.pathname)) {
            href = href.toString();
        }

        if (is.string(href) || href instanceof String) {
            this._parts = parse(String(href), this._parts);
        } else if (_URI || _object) {
            const src = _URI ? href._parts : href;
            for (key in src) {
                if (hasOwn.call(this._parts, key)) {
                    this._parts[key] = src[key];
                }
            }
        } else {
            throw new TypeError("invalid input");
        }

        this.build(!build);
        return this;
    }

    // identification accessors
    is(what) {
        let ip = false;
        let ip4 = false;
        let ip6 = false;
        let name = false;
        let sld = false;
        let idn = false;
        let punycode = false;
        let relative = !this._parts.urn;

        if (this._parts.hostname) {
            relative = false;
            ip4 = adone.regex.ip4().test(this._parts.hostname);
            ip6 = adone.regex.ip6().test(this._parts.hostname);
            ip = ip4 || ip6;
            name = !ip;
            sld = name && SLD && SLD.has(this._parts.hostname);
            idn = name && adone.regex.idn().test(this._parts.hostname);
            punycode = name && adone.regex.punycode().test(this._parts.hostname);
        }

        switch (what.toLowerCase()) {
            case "relative":
                return relative;

            case "absolute":
                return !relative;

            // hostname identification
            case "domain":
            case "name":
                return name;

            case "sld":
                return sld;

            case "ip":
                return ip;

            case "ip4":
            case "ipv4":
            case "inet4":
                return ip4;

            case "ip6":
            case "ipv6":
            case "inet6":
                return ip6;

            case "idn":
                return idn;

            case "url":
                return !this._parts.urn;

            case "urn":
                return Boolean(this._parts.urn);

            case "punycode":
                return punycode;
        }

        return null;
    }

    // compound accessors
    origin(v, build) {
        if (this._parts.urn) {
            return is.undefined(v) ? "" : this;
        }

        if (is.undefined(v)) {
            const protocol = this.protocol();
            const authority = this.authority();
            if (!authority) {
                return "";
            }

            return (protocol ? `${protocol}://` : "") + this.authority();
        }
        const origin = new URI(v);
        this
            .protocol(origin.protocol())
            .authority(origin.authority())
            .build(!build);
        return this;
    }

    host(v, build) {
        if (this._parts.urn) {
            return is.undefined(v) ? "" : this;
        }

        if (is.undefined(v)) {
            return this._parts.hostname ? buildHost(this._parts) : "";
        }
        const res = parseHost(v, this._parts);
        if (res !== "/") {
            throw new TypeError(`Hostname "${v}" contains characters other than [A-Z0-9.-]`);
        }

        this.build(!build);
        return this;
    }

    authority(v, build) {
        if (this._parts.urn) {
            return is.undefined(v) ? "" : this;
        }

        if (is.undefined(v)) {
            return this._parts.hostname ? buildAuthority(this._parts) : "";
        }
        const res = parseAuthority(v, this._parts);
        if (res !== "/") {
            throw new TypeError(`Hostname "${v}" contains characters other than [A-Z0-9.-]`);
        }

        this.build(!build);
        return this;
    }

    userinfo(v, build) {
        if (this._parts.urn) {
            return is.undefined(v) ? "" : this;
        }

        if (is.undefined(v)) {
            const t = buildUserinfo(this._parts);
            return t ? t.substring(0, t.length - 1) : t;
        }
        if (v[v.length - 1] !== "@") {
            v += "@";
        }

        parseUserinfo(v, this._parts);
        this.build(!build);
        return this;
    }

    resource(v, build) {
        let parts;

        if (is.undefined(v)) {
            return this.path() + this.search() + this.hash();
        }

        parts = parse(v);
        this._parts.path = parts.path;
        this._parts.query = parts.query;
        this._parts.fragment = parts.fragment;
        this.build(!build);
        return this;
    }

    // fraction accessors
    subdomain(v, build) {
        if (this._parts.urn) {
            return is.undefined(v) ? "" : this;
        }

        // convenience, return "www" from "www.example.org"
        if (is.undefined(v)) {
            if (!this._parts.hostname || this.is("IP")) {
                return "";
            }

            // grab domain and add another segment
            const end = this._parts.hostname.length - this.domain().length - 1;
            return this._parts.hostname.substring(0, end) || "";
        }
        const e = this._parts.hostname.length - this.domain().length;
        const sub = this._parts.hostname.substring(0, e);
        const replace = new RegExp(`^${escapeRegEx(sub)}`);

        if (v && v.charAt(v.length - 1) !== ".") {
            v += ".";
        }

        if (v.indexOf(":") !== -1) {
            throw new TypeError("Domains cannot contain colons");
        }

        if (v) {
            ensureValidHostname(v, this._parts.protocol);
        }

        this._parts.hostname = this._parts.hostname.replace(replace, v);
        this.build(!build);
        return this;
    }

    domain(v, build) {
        if (this._parts.urn) {
            return is.undefined(v) ? "" : this;
        }

        if (is.boolean(v)) {
            build = v;
            v = undefined;
        }

        // convenience, return "example.org" from "www.example.org"
        if (is.undefined(v)) {
            if (!this._parts.hostname || this.is("IP")) {
                return "";
            }

            // if hostname consists of 1 or 2 segments, it must be the domain
            const t = this._parts.hostname.match(/\./g);
            if (t && t.length < 2) {
                return this._parts.hostname;
            }

            // grab tld and add another segment
            let end = this._parts.hostname.length - this.tld(build).length - 1;
            end = this._parts.hostname.lastIndexOf(".", end - 1) + 1;
            return this._parts.hostname.substring(end) || "";
        }
        if (!v) {
            throw new TypeError("cannot set domain empty");
        }

        if (v.indexOf(":") !== -1) {
            throw new TypeError("Domains cannot contain colons");
        }

        ensureValidHostname(v, this._parts.protocol);

        if (!this._parts.hostname || this.is("IP")) {
            this._parts.hostname = v;
        } else {
            const replace = new RegExp(`${escapeRegEx(this.domain())}$`);
            this._parts.hostname = this._parts.hostname.replace(replace, v);
        }

        this.build(!build);
        return this;
    }

    tld(v, build) {
        if (this._parts.urn) {
            return is.undefined(v) ? "" : this;
        }

        if (is.boolean(v)) {
            build = v;
            v = undefined;
        }

        // return "org" from "www.example.org"
        if (is.undefined(v)) {
            if (!this._parts.hostname || this.is("IP")) {
                return "";
            }

            const pos = this._parts.hostname.lastIndexOf(".");
            const tld = this._parts.hostname.substring(pos + 1);

            if (build !== true && SLD && SLD.list[tld.toLowerCase()]) {
                return SLD.get(this._parts.hostname) || tld;
            }

            return tld;
        }
        let replace;

        if (!v) {
            throw new TypeError("cannot set TLD empty");
        } else if (v.match(/[^a-zA-Z0-9-]/)) {
            if (SLD && SLD.is(v)) {
                replace = new RegExp(`${escapeRegEx(this.tld())}$`);
                this._parts.hostname = this._parts.hostname.replace(replace, v);
            } else {
                throw new TypeError(`TLD "${v}" contains characters other than [A-Z0-9]`);
            }
        } else if (!this._parts.hostname || this.is("IP")) {
            throw new ReferenceError("cannot set TLD on non-domain host");
        } else {
            replace = new RegExp(`${escapeRegEx(this.tld())}$`);
            this._parts.hostname = this._parts.hostname.replace(replace, v);
        }

        this.build(!build);
        return this;
    }

    directory(v, build) {
        if (this._parts.urn) {
            return is.undefined(v) ? "" : this;
        }

        if (is.undefined(v) || v === true) {
            if (!this._parts.path && !this._parts.hostname) {
                return "";
            }

            if (this._parts.path === "/") {
                return "/";
            }

            const end = this._parts.path.length - this.filename().length - 1;
            const res = this._parts.path.substring(0, end) || (this._parts.hostname ? "/" : "");

            return v ? exports.decodePath(res) : res;

        }
        const e = this._parts.path.length - this.filename().length;
        const directory = this._parts.path.substring(0, e);
        const replace = new RegExp(`^${escapeRegEx(directory)}`);

        // fully qualifier directories begin with a slash
        if (!this.is("relative")) {
            if (!v) {
                v = "/";
            }

            if (v.charAt(0) !== "/") {
                v = `/${v}`;
            }
        }

        // directories always end with a slash
        if (v && v.charAt(v.length - 1) !== "/") {
            v += "/";
        }

        v = exports.recodePath(v);
        this._parts.path = this._parts.path.replace(replace, v);
        this.build(!build);
        return this;
    }

    filename(v, build) {
        if (this._parts.urn) {
            return is.undefined(v) ? "" : this;
        }

        if (!is.string(v)) {
            if (!this._parts.path || this._parts.path === "/") {
                return "";
            }

            const pos = this._parts.path.lastIndexOf("/");
            const res = this._parts.path.substring(pos + 1);

            return v ? exports.decodePathSegment(res) : res;
        }
        let mutatedDirectory = false;

        if (v.charAt(0) === "/") {
            v = v.substring(1);
        }

        if (v.match(/\.?\//)) {
            mutatedDirectory = true;
        }

        const replace = new RegExp(`${escapeRegEx(this.filename())}$`);
        v = exports.recodePath(v);
        this._parts.path = this._parts.path.replace(replace, v);

        if (mutatedDirectory) {
            this.normalizePath(build);
        } else {
            this.build(!build);
        }

        return this;
    }

    suffix(v, build) {
        if (this._parts.urn) {
            return is.undefined(v) ? "" : this;
        }

        if (is.undefined(v) || v === true) {
            if (!this._parts.path || this._parts.path === "/") {
                return "";
            }

            const filename = this.filename();
            const pos = filename.lastIndexOf(".");

            if (pos === -1) {
                return "";
            }

            // suffix may only contain alnum characters (yup, I made this up.)
            const s = filename.substring(pos + 1);
            const res = (/^[a-z0-9%]+$/i).test(s) ? s : "";
            return v ? exports.decodePathSegment(res) : res;
        }
        if (v.charAt(0) === ".") {
            v = v.substring(1);
        }

        const suffix = this.suffix();
        let replace;

        if (!suffix) {
            if (!v) {
                return this;
            }

            this._parts.path += `.${exports.recodePath(v)}`;
        } else if (!v) {
            replace = new RegExp(`${escapeRegEx(`.${suffix}`)}$`);
        } else {
            replace = new RegExp(`${escapeRegEx(suffix)}$`);
        }

        if (replace) {
            v = exports.recodePath(v);
            this._parts.path = this._parts.path.replace(replace, v);
        }

        this.build(!build);
        return this;
    }

    segment(segment, v, build) {
        const separator = this._parts.urn ? ":" : "/";
        const path = this.path();
        const absolute = path.substring(0, 1) === "/";
        let segments = path.split(separator);

        if (!is.undefined(segment) && !is.number(segment)) {
            build = v;
            v = segment;
            segment = undefined;
        }

        if (!is.undefined(segment) && !is.number(segment)) {
            throw new Error(`Bad segment "${segment}", must be 0-based integer`);
        }

        if (absolute) {
            segments.shift();
        }

        if (segment < 0) {
            // allow negative indexes to address from the end
            segment = Math.max(segments.length + segment, 0);
        }

        if (is.undefined(v)) {
            /*jshint laxbreak: true */
            return is.undefined(segment)
                ? segments
                : segments[segment];
            /*jshint laxbreak: false */
        } else if (is.null(segment) || is.undefined(segments[segment])) {
            if (isArray(v)) {
                segments = [];
                // collapse empty elements within array
                for (let i = 0, l = v.length; i < l; i++) {
                    if (!v[i].length && (!segments.length || !segments[segments.length - 1].length)) {
                        continue;
                    }

                    if (segments.length && !segments[segments.length - 1].length) {
                        segments.pop();
                    }

                    segments.push(trimSlashes(v[i]));
                }
            } else if (v || is.string(v)) {
                v = trimSlashes(v);
                if (segments[segments.length - 1] === "") {
                    // empty trailing elements have to be overwritten
                    // to prevent results such as /foo//bar
                    segments[segments.length - 1] = v;
                } else {
                    segments.push(v);
                }
            }
        } else {
            if (v) {
                segments[segment] = trimSlashes(v);
            } else {
                segments.splice(segment, 1);
            }
        }

        if (absolute) {
            segments.unshift("");
        }

        return this.path(segments.join(separator), build);
    }

    segmentCoded(segment, v, build) {
        let segments;
        let i;
        let l;

        if (!is.number(segment)) {
            build = v;
            v = segment;
            segment = undefined;
        }

        if (is.undefined(v)) {
            segments = this.segment(segment, v, build);
            if (!isArray(segments)) {
                segments = !is.undefined(segments) ? decode(segments) : undefined;
            } else {
                for (i = 0, l = segments.length; i < l; i++) {
                    segments[i] = decode(segments[i]);
                }
            }

            return segments;
        }

        if (!isArray(v)) {
            v = (is.string(v) || v instanceof String) ? encode(v) : v;
        } else {
            for (i = 0, l = v.length; i < l; i++) {
                v[i] = encode(v[i]);
            }
        }

        return this.segment(segment, v, build);
    }

    setQuery(name, value, build) {
        const data = parseQuery(this._parts.query, this._parts.escapeQuerySpace);

        if (is.string(name) || name instanceof String) {
            data[name] = !is.undefined(value) ? value : null;
        } else if (typeof name === "object") {
            for (const key in name) {
                if (hasOwn.call(name, key)) {
                    data[key] = name[key];
                }
            }
        } else {
            throw new TypeError("addQuery() accepts an object, string as the name parameter");
        }

        this._parts.query = buildQuery(data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
        if (!is.string(name)) {
            build = value;
        }

        this.build(!build);
        return this;
    }

    setSearch(name, value, build) {
        return this.setQuery(name, value, build);
    }

    addQuery(name, value, build) {
        const data = parseQuery(this._parts.query, this._parts.escapeQuerySpace);
        addQuery(data, name, is.undefined(value) ? null : value);
        this._parts.query = buildQuery(data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
        if (!is.string(name)) {
            build = value;
        }

        this.build(!build);
        return this;
    }

    addSearch(name, value, build) {
        return this.addQuery(name, value, build);
    }

    removeQuery(name, value, build) {
        const data = parseQuery(this._parts.query, this._parts.escapeQuerySpace);
        removeQuery(data, name, value);
        this._parts.query = buildQuery(data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
        if (!is.string(name)) {
            build = value;
        }

        this.build(!build);
        return this;
    }

    removeSearch(name, value, build) {
        return this.removeQuery(name, value, build);
    }

    hasQuery(name, value, withinArray) {
        const data = parseQuery(this._parts.query, this._parts.escapeQuerySpace);
        return hasQuery(data, name, value, withinArray);
    }

    hasSearch(name, value, withinArray) {
        return this.hasQuery(name, value, withinArray);
    }

    // sanitizing URLs
    normalize() {
        if (this._parts.urn) {
            return this
                .normalizeProtocol(false)
                .normalizePath(false)
                .normalizeQuery(false)
                .normalizeFragment(false)
                .build();
        }

        return this
            .normalizeProtocol(false)
            .normalizeHostname(false)
            .normalizePort(false)
            .normalizePath(false)
            .normalizeQuery(false)
            .normalizeFragment(false)
            .build();
    }

    normalizeProtocol(build) {
        if (is.string(this._parts.protocol)) {
            this._parts.protocol = this._parts.protocol.toLowerCase();
            this.build(!build);
        }

        return this;
    }

    normalizeHostname(build) {
        if (this._parts.hostname) {
            if (this.is("IDN")) {
                this._parts.hostname = adone.punycode.toASCII(this._parts.hostname);
            } else if (this.is("IPv6") && IPv6) {
                this._parts.hostname = IPv6.best(this._parts.hostname);
            }

            this._parts.hostname = this._parts.hostname.toLowerCase();
            this.build(!build);
        }

        return this;
    }

    normalizePort(build) {
        // remove port of it's the protocol's default
        if (is.string(this._parts.protocol) && this._parts.port === URI.defaultPorts[this._parts.protocol]) {
            this._parts.port = null;
            this.build(!build);
        }

        return this;
    }

    normalizePath(build) {
        let _path = this._parts.path;
        if (!_path) {
            return this;
        }

        if (this._parts.urn) {
            this._parts.path = exports.recodeUrnPath(this._parts.path);
            this.build(!build);
            return this;
        }

        if (this._parts.path === "/") {
            return this;
        }

        _path = exports.recodePath(_path);

        let _was_relative;
        let _leadingParents = "";
        let _parent;
        let _pos;

        // handle relative paths
        if (_path.charAt(0) !== "/") {
            _was_relative = true;
            _path = `/${_path}`;
        }

        // handle relative files (as opposed to directories)
        if (_path.slice(-3) === "/.." || _path.slice(-2) === "/.") {
            _path += "/";
        }

        // resolve simples
        _path = _path
            .replace(/(\/(\.\/)+)|(\/\.$)/g, "/")
            .replace(/\/{2,}/g, "/");

        // remember leading parents
        if (_was_relative) {
            _leadingParents = _path.substring(1).match(/^(\.\.\/)+/) || "";
            if (_leadingParents) {
                _leadingParents = _leadingParents[0];
            }
        }

        // resolve parents
        while (true) {
            _parent = _path.search(/\/\.\.(\/|$)/);
            if (_parent === -1) {
                // no more ../ to resolve
                break;
            } else if (_parent === 0) {
                // top level cannot be relative, skip it
                _path = _path.substring(3);
                continue;
            }

            _pos = _path.substring(0, _parent).lastIndexOf("/");
            if (_pos === -1) {
                _pos = _parent;
            }
            _path = _path.substring(0, _pos) + _path.substring(_parent + 3);
        }

        // revert to relative
        if (_was_relative && this.is("relative")) {
            _path = _leadingParents + _path.substring(1);
        }

        this._parts.path = _path;
        this.build(!build);
        return this;
    }

    normalizePathname(build) {
        return this.normalizePath(build);
    }

    normalizeQuery(build) {
        if (is.string(this._parts.query)) {
            if (!this._parts.query.length) {
                this._parts.query = null;
            } else {
                this.query(parseQuery(this._parts.query, this._parts.escapeQuerySpace));
            }

            this.build(!build);
        }

        return this;
    }

    normalizeSearch(build) {
        return this.normalizeQuery(build);
    }

    normalizeFragment(build) {
        if (!this._parts.fragment) {
            this._parts.fragment = null;
            this.build(!build);
        }

        return this;
    }

    normalizeHash(build) {
        return this.normalizeFragment(build);
    }

    iso8859() {
        // expect unicode input, iso8859 output
        const e = encode;
        const d = decode;

        encode = escape;
        decode = decodeURIComponent;
        try {
            this.normalize();
        } finally {
            encode = e;
            decode = d;
        }
        return this;
    }

    unicode() {
        // expect iso8859 input, unicode output
        const e = encode;
        const d = decode;

        encode = strictEncodeURIComponent;
        decode = unescape;
        try {
            this.normalize();
        } finally {
            encode = e;
            decode = d;
        }
        return this;
    }

    readable() {
        const uri = this.clone();
        // removing username, password, because they shouldn't be displayed according to RFC 3986
        uri.username("").password("").normalize();
        let t = "";
        if (uri._parts.protocol) {
            t += `${uri._parts.protocol}://`;
        }

        if (uri._parts.hostname) {
            if (uri.is("punycode")) {
                t += adone.punycode.toUnicode(uri._parts.hostname);
                if (uri._parts.port) {
                    t += `:${uri._parts.port}`;
                }
            } else {
                t += uri.host();
            }
        }

        if (uri._parts.hostname && uri._parts.path && uri._parts.path.charAt(0) !== "/") {
            t += "/";
        }

        t += uri.path(true);
        if (uri._parts.query) {
            let q = "";
            for (let i = 0, qp = uri._parts.query.split("&"), l = qp.length; i < l; i++) {
                const kv = (qp[i] || "").split("=");
                q += `&${decodeQuery(kv[0], this._parts.escapeQuerySpace)
                    .replace(/&/g, "%26")}`;

                if (!is.undefined(kv[1])) {
                    q += `=${decodeQuery(kv[1], this._parts.escapeQuerySpace)
                        .replace(/&/g, "%26")}`;
                }
            }
            t += `?${q.substring(1)}`;
        }

        t += decodeQuery(uri.hash(), true);
        return t;
    }

    // resolving relative and absolute URLs
    absoluteTo(base) {
        const resolved = this.clone();
        const properties = ["protocol", "username", "password", "hostname", "port"];
        let basedir;
        let i;
        let p;

        if (this._parts.urn) {
            throw new Error("URNs do not have any generally defined hierarchical components");
        }

        if (!(base instanceof URI)) {
            base = new URI(base);
        }

        if (resolved._parts.protocol) {
            // Directly returns even if this._parts.hostname is empty.
            return resolved;
        }
        resolved._parts.protocol = base._parts.protocol;


        if (this._parts.hostname) {
            return resolved;
        }

        for (i = 0; (p = properties[i]); i++) {
            resolved._parts[p] = base._parts[p];
        }

        if (!resolved._parts.path) {
            resolved._parts.path = base._parts.path;
            if (!resolved._parts.query) {
                resolved._parts.query = base._parts.query;
            }
        } else {
            if (resolved._parts.path.substring(-2) === "..") {
                resolved._parts.path += "/";
            }

            if (resolved.path().charAt(0) !== "/") {
                basedir = base.directory();
                basedir = basedir ? basedir : base.path().indexOf("/") === 0 ? "/" : "";
                resolved._parts.path = (basedir ? (`${basedir}/`) : "") + resolved._parts.path;
                resolved.normalizePath();
            }
        }

        resolved.build();
        return resolved;
    }

    relativeTo(base) {
        const relative = this.clone().normalize();
        if (relative._parts.urn) {
            throw new Error("URNs do not have any generally defined hierarchical components");
        }

        base = new URI(base).normalize();
        const relativeParts = relative._parts;
        const baseParts = base._parts;
        const relativePath = relative.path();
        const basePath = base.path();

        if (relativePath.charAt(0) !== "/") {
            throw new Error("URI is already relative");
        }

        if (basePath.charAt(0) !== "/") {
            throw new Error("Cannot calculate a URI relative to another relative URI");
        }

        if (relativeParts.protocol === baseParts.protocol) {
            relativeParts.protocol = null;
        }

        if (relativeParts.username !== baseParts.username || relativeParts.password !== baseParts.password) {
            return relative.build();
        }

        if (!is.null(relativeParts.protocol) || !is.null(relativeParts.username) || !is.null(relativeParts.password)) {
            return relative.build();
        }

        if (relativeParts.hostname === baseParts.hostname && relativeParts.port === baseParts.port) {
            relativeParts.hostname = null;
            relativeParts.port = null;
        } else {
            return relative.build();
        }

        if (relativePath === basePath) {
            relativeParts.path = "";
            return relative.build();
        }

        // determine common sub path
        const common = commonPath(relativePath, basePath);

        // If the paths have nothing in common, return a relative URL with the absolute path.
        if (!common) {
            return relative.build();
        }

        const parents = baseParts.path
            .substring(common.length)
            .replace(/[^\/]*$/, "")
            .replace(/.*?\//g, "../");

        relativeParts.path = (parents + relativeParts.path.substring(common.length)) || "./";

        return relative.build();
    }

    // comparing URIs
    equals(uri) {
        const one = this.clone();
        const two = new URI(uri);
        let one_map = {};
        let two_map = {};
        const checked = {};
        let one_query, two_query, key;

        one.normalize();
        two.normalize();

        // exact match
        if (one.toString() === two.toString()) {
            return true;
        }

        // extract query string
        one_query = one.query();
        two_query = two.query();
        one.query("");
        two.query("");

        // definitely not equal if not even non-query parts match
        if (one.toString() !== two.toString()) {
            return false;
        }

        // query parameters have the same length, even if they're permuted
        if (one_query.length !== two_query.length) {
            return false;
        }

        one_map = parseQuery(one_query, this._parts.escapeQuerySpace);
        two_map = parseQuery(two_query, this._parts.escapeQuerySpace);

        for (key in one_map) {
            if (hasOwn.call(one_map, key)) {
                if (!isArray(one_map[key])) {
                    if (one_map[key] !== two_map[key]) {
                        return false;
                    }
                } else if (!arraysEqual(one_map[key], two_map[key])) {
                    return false;
                }

                checked[key] = true;
            }
        }

        for (key in two_map) {
            if (hasOwn.call(two_map, key)) {
                if (!checked[key]) {
                    // two contains a parameter not present in one
                    return false;
                }
            }
        }

        return true;
    }

    // state
    preventInvalidHostname(v) {
        this._parts.preventInvalidHostname = Boolean(v);
        return this;
    }

    duplicateQueryParameters(v) {
        this._parts.duplicateQueryParameters = Boolean(v);
        return this;
    }

    escapeQuerySpace(v) {
        this._parts.escapeQuerySpace = Boolean(v);
        return this;
    }
}

URI._parts = function () {
    return {
        protocol: null,
        username: null,
        password: null,
        hostname: null,
        urn: null,
        port: null,
        path: null,
        query: null,
        fragment: null,
        // state
        preventInvalidHostname: URI.preventInvalidHostname,
        duplicateQueryParameters: URI.duplicateQueryParameters,
        escapeQuerySpace: URI.escapeQuerySpace
    };
};
// state: throw on invalid hostname
// see https://github.com/medialize/URI.js/pull/345
// and https://github.com/medialize/URI.js/issues/354
URI.preventInvalidHostname = false;
// state: allow duplicate query parameters (a=1&a=1)
URI.duplicateQueryParameters = false;
// state: replaces + with %20 (space in query strings)
URI.escapeQuerySpace = true;
URI.findUri = {
    // valid "scheme://" or "www."
    start: /\b(?:([a-z][a-z0-9.+-]*:\/\/)|www\.)/gi,
    // everything up to the next whitespace
    end: /[\s\r\n]|$/,
    // trim trailing punctuation captured by end RegExp
    trim: /[`!()\[\]{};:'".,<>?«»“”„‘’]+$/,
    // balanced parens inclusion (), [], {}, <>
    parens: /(\([^\)]*\)|\[[^\]]*\]|\{[^}]*\}|<[^>]*>)/g
};
// http://www.iana.org/assignments/uri-schemes.html
// http://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers#Well-known_ports
URI.defaultPorts = {
    http: "80",
    https: "443",
    ftp: "21",
    gopher: "70",
    ws: "80",
    wss: "443"
};

// map DOM Elements to their URI attribute
URI.domAttributes = {
    a: "href",
    blockquote: "cite",
    link: "href",
    base: "href",
    script: "src",
    form: "action",
    img: "src",
    area: "href",
    iframe: "src",
    embed: "src",
    source: "src",
    track: "src",
    input: "src", // but only if type="image"
    audio: "src",
    video: "src"
};
URI.getDomAttribute = function (node) {
    if (!node || !node.nodeName) {
        return undefined;
    }

    const nodeName = node.nodeName.toLowerCase();
    // <input> should only expose src for type="image"
    if (nodeName === "input" && node.type !== "image") {
        return undefined;
    }

    return URI.domAttributes[nodeName];
};

URI.iso8859 = function () {
    encode = escape;
    decode = unescape;
};
URI.unicode = function () {
    encode = strictEncodeURIComponent;
    decode = decodeURIComponent;
};
URI.characters = {
    pathname: {
        encode: {
            // RFC3986 2.1: For consistency, URI producers and normalizers should
            // use uppercase hexadecimal digits for all percent-encodings.
            expression: /%(24|26|2B|2C|3B|3D|3A|40)/ig,
            map: {
                // -._~!'()*
                "%24": "$",
                "%26": "&",
                "%2B": "+",
                "%2C": ",",
                "%3B": ";",
                "%3D": "=",
                "%3A": ":",
                "%40": "@"
            }
        },
        decode: {
            expression: /[\/\?#]/g,
            map: {
                "/": "%2F",
                "?": "%3F",
                "#": "%23"
            }
        }
    },
    reserved: {
        encode: {
            // RFC3986 2.1: For consistency, URI producers and normalizers should
            // use uppercase hexadecimal digits for all percent-encodings.
            expression: /%(21|23|24|26|27|28|29|2A|2B|2C|2F|3A|3B|3D|3F|40|5B|5D)/ig,
            map: {
                // gen-delims
                "%3A": ":",
                "%2F": "/",
                "%3F": "?",
                "%23": "#",
                "%5B": "[",
                "%5D": "]",
                "%40": "@",
                // sub-delims
                "%21": "!",
                "%24": "$",
                "%26": "&",
                "%27": "'",
                "%28": "(",
                "%29": ")",
                "%2A": "*",
                "%2B": "+",
                "%2C": ",",
                "%3B": ";",
                "%3D": "="
            }
        }
    },
    urnpath: {
        // The characters under `encode` are the characters called out by RFC 2141 as being acceptable
        // for usage in a URN. RFC2141 also calls out "-", ".", and "_" as acceptable characters, but
        // these aren't encoded by encodeURIComponent, so we don't have to call them out here. Also
        // note that the colon character is not featured in the encoding map; this is because URI.js
        // gives the colons in URNs semantic meaning as the delimiters of path segements, and so it
        // should not appear unencoded in a segment itself.
        // See also the note above about RFC3986 and capitalalized hex digits.
        encode: {
            expression: /%(21|24|27|28|29|2A|2B|2C|3B|3D|40)/ig,
            map: {
                "%21": "!",
                "%24": "$",
                "%27": "'",
                "%28": "(",
                "%29": ")",
                "%2A": "*",
                "%2B": "+",
                "%2C": ",",
                "%3B": ";",
                "%3D": "=",
                "%40": "@"
            }
        },
        // These characters are the characters called out by RFC2141 as "reserved" characters that
        // should never appear in a URN, plus the colon character (see note above).
        decode: {
            expression: /[\/\?#:]/g,
            map: {
                "/": "%2F",
                "?": "%3F",
                "#": "%23",
                ":": "%3A"
            }
        }
    }
};

// generate encode/decode path functions
const _parts = { encode: "encode", decode: "decode" };
let _part;
const generateAccessor = function (_group, _part) {
    return function (string) {
        try {
            return exports[_part](String(string)).replace(URI.characters[_group][_part].expression, (c) => {
                return URI.characters[_group][_part].map[c];
            });
        } catch (e) {
            // we're not going to mess with weird encodings,
            // give up and return the undecoded original string
            // see https://github.com/medialize/URI.js/issues/87
            // see https://github.com/medialize/URI.js/issues/92
            return string;
        }
    };
};

for (_part in _parts) {
    exports[`${_part}PathSegment`] = generateAccessor("pathname", _parts[_part]);
    exports[`${_part}UrnPathSegment`] = generateAccessor("urnpath", _parts[_part]);
}

const generateSegmentedPathFunction = function (_sep, _codingFuncName, _innerCodingFuncName) {
    return function (string) {
        // Why pass in names of functions, rather than the function objects themselves? The
        // definitions of some functions (but in particular, URI.decode) will occasionally change due
        // to URI.js having ISO8859 and Unicode modes. Passing in the name and getting it will ensure
        // that the functions we use here are "fresh".
        const actualCodingFunc = _innerCodingFuncName ? (string) => exports[_codingFuncName](exports[_innerCodingFuncName](string)) : exports[_codingFuncName];

        const segments = (String(string)).split(_sep);

        for (let i = 0, length = segments.length; i < length; i++) {
            segments[i] = actualCodingFunc(segments[i]);
        }

        return segments.join(_sep);
    };
};

// This takes place outside the above loop because we don't want, e.g., encodeUrnPath functions.
export const decodePath = generateSegmentedPathFunction("/", "decodePathSegment");
export const decodeUrnPath = generateSegmentedPathFunction(":", "decodeUrnPathSegment");
export const recodePath = generateSegmentedPathFunction("/", "encodePathSegment", "decode");
export const recodeUrnPath = generateSegmentedPathFunction(":", "encodeUrnPathSegment", "decode");

export const encodeReserved = generateAccessor("reserved", "encode");

export const withinString = function (string, callback, options) {
    options || (options = {});
    const _start = options.start || URI.findUri.start;
    const _end = options.end || URI.findUri.end;
    const _trim = options.trim || URI.findUri.trim;
    const _parens = options.parens || URI.findUri.parens;
    const _attributeOpen = /[a-z0-9-]=["']?$/i;

    _start.lastIndex = 0;
    while (true) {
        const match = _start.exec(string);
        if (!match) {
            break;
        }

        const start = match.index;
        if (options.ignoreHtml) {
            // attribut(e=["']?$)
            const attributeOpen = string.slice(Math.max(start - 3, 0), start);
            if (attributeOpen && _attributeOpen.test(attributeOpen)) {
                continue;
            }
        }

        let end = start + string.slice(start).search(_end);
        let slice = string.slice(start, end);
        // make sure we include well balanced parens
        let parensEnd = -1;
        while (true) {
            const parensMatch = _parens.exec(slice);
            if (!parensMatch) {
                break;
            }

            const parensMatchEnd = parensMatch.index + parensMatch[0].length;
            parensEnd = Math.max(parensEnd, parensMatchEnd);
        }

        if (parensEnd > -1) {
            slice = slice.slice(0, parensEnd) + slice.slice(parensEnd).replace(_trim, "");
        } else {
            slice = slice.replace(_trim, "");
        }

        if (slice.length <= match[0].length) {
            // the extract only contains the starting marker of a URI,
            // e.g. "www" or "http://"
            continue;
        }

        if (options.ignore && options.ignore.test(slice)) {
            continue;
        }

        end = start + slice.length;
        let result = callback(slice, start, end, string);
        if (is.undefined(result)) {
            _start.lastIndex = end;
            continue;
        }

        result = String(result);
        string = string.slice(0, start) + result + string.slice(end);
        _start.lastIndex = start + result.length;
    }

    _start.lastIndex = 0;
    return string;
};

// Extending Fragment URI

// // old handlers we need to wrap
// const f = p.fragment;
// const b = p.build;

// // make fragmentPrefix configurable
// URI.fragmentPrefix = "!";
// const _parts = URI._parts;

// URI._parts = function () {
//     const parts = _parts();
//     parts.fragmentPrefix = URI.fragmentPrefix;
//     return parts;
// };
// fragmentPrefix(v) {
//     this._parts.fragmentPrefix = v;
//     return this;
// }

// // add fragment(true) and fragment(URI) signatures  
// fragment(v, build) {
//     const prefix = this._parts.fragmentPrefix;
//     const fragment = this._parts.fragment || "";
//     let furi;

//     if (v === true) {
//         if (fragment.substring(0, prefix.length) !== prefix) {
//             furi = URI("");
//         } else {
//             furi = new URI(fragment.substring(prefix.length));
//         }

//         this._fragmentURI = furi;
//         furi._parentURI = this;
//         return furi;
//     } else if (!is.undefined(v) && !is.string(v)) {
//         this._fragmentURI = v;
//         v._parentURI = v;
//         this._parts.fragment = prefix + v.toString();
//         this.build(!build);
//         return this;
//     } else if (is.string(v)) {
//         this._fragmentURI = undefined;
//     }

//     return f.call(this, v, build);
// }

// // make .build() of the actual URI aware of the FragmentURI
// build(deferBuild) {
//     const t = b.call(this, deferBuild);

//     if (deferBuild !== false && this._parentURI) {
//         // update the parent
//         this._parentURI.fragment(this);
//     }

//     return t;
// }


// Extending Fragment Query

// const p = URI.prototype;
// // old fragment handler we need to wrap
// const f = p.fragment;

// // make fragmentPrefix configurable
// URI.fragmentPrefix = "?";
// const _parts = URI._parts;
// URI._parts = function () {
//     const parts = _parts();
//     parts.fragmentPrefix = URI.fragmentPrefix;
//     return parts;
// };
// p.fragmentPrefix = function (v) {
//     this._parts.fragmentPrefix = v;
//     return this;
// };

// // add fragment(true) and fragment({key: value}) signatures
// p.fragment = function (v, build) {
//     const prefix = this._parts.fragmentPrefix;
//     const fragment = this._parts.fragment || "";

//     if (v === true) {
//         if (fragment.substring(0, prefix.length) !== prefix) {
//             return {};
//         }

//         return URI.parseQuery(fragment.substring(prefix.length));
//     } else if (!is.undefined(v) && !is.string(v)) {
//         this._parts.fragment = prefix + buildQuery(v);
//         this.build(!build);
//         return this;
//     } 
//     return f.call(this, v, build);

// };
// p.addFragment = function (name, value, build) {
//     const prefix = this._parts.fragmentPrefix;
//     const data = URI.parseQuery((this._parts.fragment || "").substring(prefix.length));
//     addQuery(data, name, value);
//     this._parts.fragment = prefix + buildQuery(data);
//     if (!is.string(name)) {
//         build = value;
//     }

//     this.build(!build);
//     return this;
// };
// p.removeFragment = function (name, value, build) {
//     const prefix = this._parts.fragmentPrefix;
//     const data = URI.parseQuery((this._parts.fragment || "").substring(prefix.length));
//     removeQuery(data, name, value);
//     this._parts.fragment = prefix + buildQuery(data);
//     if (!is.string(name)) {
//         build = value;
//     }

//     this.build(!build);
//     return this;
// };
// p.setFragment = function (name, value, build) {
//     const prefix = this._parts.fragmentPrefix;
//     const data = URI.parseQuery((this._parts.fragment || "").substring(prefix.length));
//     setQuery(data, name, value);
//     this._parts.fragment = prefix + buildQuery(data);
//     if (!is.string(name)) {
//         build = value;
//     }

//     this.build(!build);
//     return this;
// };
// p.addHash = p.addFragment;
// p.removeHash = p.removeFragment;
// p.setHash = p.setFragment;
