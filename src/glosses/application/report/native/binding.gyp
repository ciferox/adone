{
  'targets': [
    {
      "target_name": "report",
      "sources": [ "src/report.cc", "src/module.cc", "src/utilities.cc" ],
      "include_dirs": [ "<(adone_native_dir)/nan" ],
      "conditions": [
        ["OS=='linux'", {
            "defines": [ "_GNU_SOURCE" ],
            "cflags": [ "-g", "-O2", "-std=c++11", ],
        }],
        ["OS=='win'", {
            "libraries": [ "dbghelp.lib", "Netapi32.lib", "PsApi.lib", "Ws2_32.lib" ],
            "dll_files": [ "dbghelp.dll", "Netapi32.dll", "PsApi.dll", "Ws2_32.dll" ],
        }],
      ],
      "defines": [
        'NODEREPORT_VERSION="1.0.0"'
      ]
    }
  ]
}
