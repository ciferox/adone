{
  'variables': {
    'driver%': 'libusb'
  },
  'targets': [
    {
      'target_name': 'hidapi',
      'type': 'static_library',
      'conditions': [
        [ 'OS=="mac"', {
          'sources': [ 'src/deps/mac/hid.c' ],
          'include_dirs+': [
            '/usr/include/libusb-1.0/'
          ]
        }],
        [ 'OS=="linux"', {
          'conditions': [
            [ 'driver=="libusb"', {
              'sources': [ 'src/deps/libusb/hid.c' ],
              'include_dirs+': [
                '/usr/include/libusb-1.0/'
              ]
            }],
            [ 'driver=="hidraw"', {
              'sources': [ 'src/deps/linux/hid.c' ]
            }]
          ]
        }],
        [ 'OS=="win"', {
          'sources': [ 'src/deps/windows/hid.c' ],
          'msvs_settings': {
            'VCLinkerTool': {
              'AdditionalDependencies': [
                'setupapi.lib',
              ]
            }
          }
        }]
      ],
      'direct_dependent_settings': {
        'include_dirs': [
          'src/deps/hidapi',
          "<(adone_root_dir)/nan",
          "<(adone_root_dir)/src/native"
        ]
      },
      'include_dirs': [
        'src/deps/hidapi'
      ],
      'defines': [
        '_LARGEFILE_SOURCE',
        '_FILE_OFFSET_BITS=64',
      ],
      'cflags': ['-g'],
      'cflags!': [
        '-ansi'
      ]
    },
    {
      'target_name': 'hid',
      'sources': [ 'src/hid.cc' ],
      'dependencies': ['hidapi'],
      'defines': [
        '_LARGEFILE_SOURCE',
        '_FILE_OFFSET_BITS=64',
      ],
      'conditions': [
        [ 'OS=="mac"', {
              'LDFLAGS': [
            '-framework IOKit',
            '-framework CoreFoundation'
          ],
          'xcode_settings': {
            'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
            'OTHER_LDFLAGS': [
              '-framework IOKit',
              '-framework CoreFoundation'
            ],
          }
        }],
        [ 'OS=="linux"', {
          'conditions': [
            [ 'driver=="libusb"', {
              'libraries': [
                '-lusb-1.0'
              ]
            }],
            [ 'driver=="hidraw"', {
              'libraries': [
                '-ludev',
                '-lusb-1.0'
              ]
            }]
          ],
        }],
        [ 'OS=="win"', {
          'msvs_settings': {
            'VCLinkerTool': {
              'AdditionalDependencies': [
                'setupapi.lib'
              ]
            }
          }
        }]
      ],
      'cflags!': ['-ansi', '-fno-exceptions' ],
      'cflags_cc!': [ '-fno-exceptions' ],
      'cflags': ['-g', '-exceptions'],
      'cflags_cc': ['-g', '-exceptions']
    }
  ]
}
