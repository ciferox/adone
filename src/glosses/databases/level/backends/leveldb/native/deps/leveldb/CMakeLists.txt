cmake_minimum_required(VERSION 3.8)

project(libleveldb C CXX)

add_subdirectory("../../../../../../../compressors/snappy/native/src/snappy" "snappy")

add_definitions(-DSNAPPY=1)

if(WIN32)
    add_definitions(
        -DWIN32
        -D_CRT_NONSTDC_NO_DEPRECATE
        -D_SCL_SECURE_NO_WARNINGS
        -D_CRT_SECURE_NO_WARNINGS
        -DNOMINMAX=1,
        -D_HAS_EXCEPTIONS=0
        -DLEVELDB_ATOMIC_PRESENT
        -DLEVELDB_PLATFORM_UV=1
    )

    SET(CMAKE_C_FLAGS_RELEASE "/O2 /GL /Gy /EHsc")

    add_library(libleveldb
        db/builder.cc
        db/db_impl.cc
        db/db_iter.cc
        db/filename.cc
        db/dbformat.cc
        db/log_reader.cc
        db/log_writer.cc
        db/memtable.cc
        db/repair.cc
        db/table_cache.cc
        db/version_edit.cc
        db/version_set.cc
        db/write_batch.cc
        helpers/memenv/memenv.cc
        port/port_posix_sse.cc
        table/block.cc
        table/block_builder.cc
        table/filter_block.cc
        table/format.cc
        table/iterator.cc
        table/merger.cc
        table/table.cc
        table/table_builder.cc
        table/two_level_iterator.cc
        util/arena.cc
        util/bloom.cc
        util/cache.cc
        util/coding.cc
        util/comparator.cc
        util/crc32c.cc
        util/env.cc
        util/filter_policy.cc
        util/hash.cc
        util/logging.cc
        util/options.cc
        util/status.cc

        ../port-libuv/port_uv.cc
        ../port-libuv/env_win.cc
        ../port-libuv/win_logger.cc)

    target_link_libraries(libleveldb PUBLIC Iphlpapi.lib Shlwapi.lib)

else(WIN32)

    add_definitions(
        -DLEVELDB_PLATFORM_POSIX=1
    )

    add_library(libleveldb
        db/builder.cc
        db/db_impl.cc
        db/db_iter.cc
        db/filename.cc
        db/dbformat.cc
        db/log_reader.cc
        db/log_writer.cc
        db/memtable.cc
        db/repair.cc
        db/table_cache.cc
        db/version_edit.cc
        db/version_set.cc
        db/write_batch.cc
        helpers/memenv/memenv.cc
        port/port_posix_sse.cc
        port/port_posix.cc
        table/block.cc
        table/block_builder.cc
        table/filter_block.cc
        table/format.cc
        table/iterator.cc
        table/merger.cc
        table/table.cc
        table/table_builder.cc
        table/two_level_iterator.cc
        util/arena.cc
        util/bloom.cc
        util/cache.cc
        util/coding.cc
        util/comparator.cc
        util/crc32c.cc
        util/env.cc
        util/env_posix.cc
        util/filter_policy.cc
        util/hash.cc
        util/logging.cc
        util/options.cc
        util/status.cc)

    set_target_properties(libleveldb PROPERTIES
        COMPILE_FLAGS "-std=c++0x -Wno-unused-but-set-variable -fno-builtin-memcmp -Wno-sign-compare -pthread"
        POSITION_INDEPENDENT_CODE ON)

    if (CMAKE_SYSTEM_NAME STREQUAL "Linux")
        add_definitions(
            -DOS_LINUX=1
        )

        target_link_libraries(libleveldb PUBLIC pthread)
    endif()
endif(WIN32)

target_include_directories(libleveldb PRIVATE
    ${CMAKE_JS_INC}
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/../port-libuv
    "include")

target_link_libraries(libleveldb PUBLIC snappylib)
