{
  'targets': [
    {
      'target_name': 'serial',
      'sources': [
        'src/serialport.cc',
      ],
      'include_dirs': [
        "<(adone_native_dir)/nan"
      ],
      'conditions': [
        ['OS=="win"',
          {
            'sources': [
              'src/serialport_win.cc'
            ],
            'msvs_settings': {
              'VCCLCompilerTool': {
                'ExceptionHandling': '2',
                'DisableSpecificWarnings': [ '4530', '4506' ],
              },
            },
          },
        ],
        ['OS=="mac"',
          {
            'sources': [
              'src/serialport_unix.cc',
              'src/read-poller.cc',
            ],
            'xcode_settings': {
              'OTHER_LDFLAGS': [
                '-framework CoreFoundation -framework IOKit'
              ]
            }
          }
        ],
        ['OS!="win"',
          {
            'sources': [
              'src/serialport_unix.cc',
              'src/read-poller.cc',
            ],
          }
        ],
      ],
    }
  ]
}
