#!/usr/bin/env zx

// TODO:
// 1. Disable js-shell in mozconfigs/{release,debug}
//    as it's not needed for the wasm embedding
// 2. Figure out why debug builds are not working; 
//    when passing `--enable-debug` the clang compiler
//    complains about signal emulation not supported by WASI.
//    It's likely that this is a legit bug; mozilla's build
//    only performs release builds: https://github.com/mozilla/gecko-dev/blob/master/js/src/devtools/automation/variants/wasi

const GECKO_DEV_DIR = 'gecko-dev';
const UPSTREAM = await $`cat UPSTREAM`;
const COMMIT = await $`cat COMMIT`;
const BUILD_ARTIFACTS = ['obj', 'include', 'lib'];
const OBJ_FILES = await $`cat object-files.list`;
const BASE_PATH = process.cwd();
const PLATFORM = process.platform;

let buildType = argv['_'][1];

if (buildType !== 'debug') {
  buildType = 'release';
}

BUILD_ARTIFACTS.forEach(async (artifact) => {
  if (fs.pathExists(artifact)) {
    await $`rm -rf ${artifact}`;
  }
});

if (!fs.pathExistsSync(GECKO_DEV_DIR)) {
  await $`mkdir ${GECKO_DEV_DIR}`;
  cd(GECKO_DEV_DIR);
  await $`git init`;
  await $`git remote add origin ${UPSTREAM}`;
  await $`git fetch --depth=1 origin ${COMMIT} --progress`;
  await $`git checkout ${COMMIT}`;
  cd(BASE_PATH);
}

cd(GECKO_DEV_DIR);
await $`./mach --no-interactive bootstrap --application-choice=js`;

process.env.MOZCONFIG = `${BASE_PATH}/mozconfigs/release`;
process.env.MOZ_OBJDIR = `${BASE_PATH}/obj`;

if (buildType === 'debug') {
  process.env.MOZCONFIG = `${BASE_PATH}/mozconfigs/debug`;
}

await $`./mach build`;
cd(BASE_PATH);

BUILD_ARTIFACTS.slice(2).forEach(async (artifact) => await fs.ensureDir(artifact));

// Copy headers into final build location
await $`cp -L -R obj/dist/include include`;
await $`cp obj/js/src/js-confdefs.h include`;

let objs = OBJ_FILES
  .stdout
  .split('\n')
  .filter(entry => entry !== '');

// Copy object files and static libraries into final build location
const STATIC_LIBS = ['js/src/build/libjs_static.a', `wasm32-wasi/${buildType}/libjsrust.a`];
STATIC_LIBS.concat(objs).forEach(async (obj) => {
  await fs.copy(`obj/${obj}`, `lib/${path.basename(obj)}`);
});
