// Copyright 2011 Mark Cavage <mcavage@gmail.com> All rights reserved.

// If you have no idea what ASN.1 or BER is, see this:
// ftp://ftp.rsa.com/pub/pkcs/ascii/layman.asc
import Ber from "./ber/index";

export { Ber };
export const BerReader = Ber.Reader;
export const BerWriter = Ber.Writer;
