{
  'targets': [
    {
        "target_name": "metrics",
        "include_dirs": [
          "<(adone_root_dir)/nan",
          "<(adone_root_dir)/src/native"
        ],
        "sources": [
            "src/system.cc"
        ],
        'conditions': [
          ['OS=="win"', {
            "sources": [
              "src/win32/wmi.cc"
            ],
            "include_dirs": ["src/native/metrics"]
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
