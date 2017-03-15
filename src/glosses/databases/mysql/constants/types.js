// mysql-5.5.23/include/mysql_com.h
// some more info here: http://dev.mysql.com/doc/refman/5.5/en/c-api-prepared-statement-type-codes.html
export const DECIMAL = 0x00; // aka DECIMAL (http://dev.mysql.com/doc/refman/5.0/en/precision-math-decimal-changes.html)
export const TINY = 0x01; // aka TINYINT, 1 byte
export const SHORT = 0x02; // aka SMALLINT, 2 bytes
export const LONG = 0x03; // aka INT, 4 bytes
export const FLOAT = 0x04; // aka FLOAT, 4-8 bytes
export const DOUBLE = 0x05; // aka DOUBLE, 8 bytes
export const NULL = 0x06; // NULL (used for prepared statements, I think)
export const TIMESTAMP = 0x07; // aka TIMESTAMP
export const LONGLONG = 0x08; // aka BIGINT, 8 bytes
export const INT24 = 0x09; // aka MEDIUMINT, 3 bytes
export const DATE = 0x0a; // aka DATE
export const TIME = 0x0b; // aka TIME
export const DATETIME = 0x0c; // aka DATETIME
export const YEAR = 0x0d; // aka YEAR, 1 byte (don't ask)
export const NEWDATE = 0x0e; // aka ?
export const VARCHAR = 0x0f; // aka VARCHAR (?)
export const BIT = 0x10; // aka BIT, 1-8 byte
export const JSON = 0xf5;
export const NEWDECIMAL = 0xf6; // aka DECIMAL
export const ENUM = 0xf7; // aka ENUM
export const SET = 0xf8; // aka SET
export const TINY_BLOB = 0xf9; // aka TINYBLOB, TINYTEXT
export const MEDIUM_BLOB = 0xfa; // aka MEDIUMBLOB, MEDIUMTEXT
export const LONG_BLOB = 0xfb; // aka LONGBLOG, LONGTEXT
export const BLOB = 0xfc; // aka BLOB, TEXT
export const VAR_STRING = 0xfd; // aka VARCHAR, VARBINARY
export const STRING = 0xfe; // aka CHAR, BINARY
export const GEOMETRY = 0xff; // aka GEOMETRY
