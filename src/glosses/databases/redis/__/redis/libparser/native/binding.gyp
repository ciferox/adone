{
  'targets': [
    {
      'target_name': 'hiredis',
      'sources': [
          'src/hiredis.cc'
        , 'src/reader.cc'
      ],
      'include_dirs': [
        "<(adone_root_dir)/nan"
      ],
      'dependencies': [
        'src/libhiredis/hiredis.gyp:hiredis-c'
      ],
      'defines': [
          '_GNU_SOURCE'
      ],
      'cflags': [
          '-Wall',
          '-O3'
      ]
    }
  ]
}
