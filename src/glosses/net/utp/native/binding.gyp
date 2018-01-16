{
  'targets': [
    {
      'target_name': 'utp',
      'dependencies': [
        'src/libutp/libutp.gyp:libutp',
      ],
      'include_dirs' : [
        "<(adone_native_dir)/nan",
        'src/libutp/libutp',
      ],
      'sources': [
        'src/utp_uv.cc',
        'src/socket_wrap.cc',
        'src/utp_wrap.cc',
        'src/binding.cc',
      ],
      'xcode_settings': {
        'OTHER_CFLAGS': [
          '-O3',
        ]
      },
      'cflags': [
        '-O3',
      ],
      'conditions': [
        ['OS=="win"', {
          'link_settings': {
            'libraries': [
              '-lws2_32.lib'
            ]
          }
        }]
      ],      
    }
  ]
}
