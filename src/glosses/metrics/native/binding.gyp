{
  'targets': [
    {
        "target_name": "metrics",
        "include_dirs": [
          "<(adone_native_dir)/nan",
          "<(adone_native_dir)/adone"
        ],
        "sources": [
            "src/system.cc"
        ],
        'conditions': [
          ['OS=="win"', {
            "sources": [
              "src/win32/wmi.cc"
            ]
         }],
          ['OS=="freebsd"', {
            "libraries": [
              "/usr/lib/libprocstat.so"
            ]
         }]
        ]
    }
  ]
}
