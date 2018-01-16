{
  'targets': [
    {
      "target_name": "rpigpio",
      "conditions": [
        ["OS!='win' and OS!='freebsd'", {
          "conditions": [[
              "OS == \"linux\"", {
              "cflags": [
                  "-Wno-unused-local-typedefs"
              ]
              }]
          ],
          "cflags": [
              "-Wall",
              "-O3"
          ],
          "include_dirs" : [
            "<(adone_native_dir)/nan"
          ],
          "sources": [
              "src/deps/pigpio.c",
              "src/deps/custom.cext",
              "src/deps/command.c",
              "src/gpio.cc"
          ],
          "link_settings": {
              "libraries": [
              "-pthread",

              ]
          }
        }]
      ]
    }
  ]
}
