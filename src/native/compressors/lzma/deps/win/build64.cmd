set SRC_PATH=%2
set DST_PATH=%1
set LIB_PATH=%DST_PATH%\lib\lzma.lib

if not exist %DST_PATH% mkdir %DST_PATH%

call 'lib /DEF:%SRC_PATH%\liblzma.def /OUT:%LIB_PATH% /MACHINE:x64'