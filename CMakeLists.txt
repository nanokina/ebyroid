cmake_minimum_required(VERSION 3.16.4)

# oops!
# set(CMAKE_GENERATOR_PLATFORM Win32)

# WTF: https://gitlab.kitware.com/cmake/cmake/issues/19409
set(CMAKE_GENERATOR_PLATFORM Win32 CACHE INTERNAL "")

# Dumb options for dumb visual studio compiler
add_compile_options(/utf-8 /std:c++17)

# Project Name
project(ebyroid)

# Build a shared library named after the project from the files in `src/`
file(GLOB SOURCE_FILES "src/*.cc" "src/*.h")
add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES} ${CMAKE_JS_SRC})

# Gives our library file a .node extension without any "lib" prefix
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")

# Essential include files to build a node addon,
# You should add this line in every CMake.js based project
target_include_directories(${PROJECT_NAME} PRIVATE ${CMAKE_JS_INC})

# Essential library files to link to a node addon
# You should add this line in every CMake.js based project
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB})
