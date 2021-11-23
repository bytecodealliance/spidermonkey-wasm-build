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
const BUILD_ARTIFACTS = ['obj', 'lib', 'include'];
const OBJ_FILES = await $`cat object-files.list`;

let buildType = argv['_'][1];

if (buildType !== 'debug') {
  buildType = 'release';
}

if (!fs.pathExists(GECKO_DEV_DIR)) {
  await $`git clone ${UPSTREAM}`;
}

BUILD_ARTIFACTS.forEach(async (artifact) => {
  if (fs.pathExists(artifact)) {
    await $`rm -rf ${artifact}`;
  }
});

cd(GECKO_DEV_DIR);
await $`git checkout ${COMMIT}`;
await $`./mach --no-interactive bootstrap --application-choice=js`;

process.env.MOZCONFIG = "../mozconfigs/release";
process.env.MOZ_OBJDIR = "../obj";

if (buildType === 'debug') {
  process.env.MOZCONFIG = "../mozconfigs/debug";
}

await $`./mach build`;
cd('..');

BUILD_ARTIFACTS.slice(1).forEach(async (artifact) => await fs.ensureDir(artifact));

['obj/dist/include', 'obj/js/src/js-confdefs.h'].forEach(async (include) => {
  let target = 'include';
  if (include.endsWith('js-confdefs.h')) {
    target = 'include/js-confdefs.h';
  }
  await fs.copy(include, target, {dereference: true});
});

const obj = OBJ_FILES
  .stdout
  .split('\n')
  .filter(entry => entry !== '');

const STATIC_LIBS = ['js/src/build/libjs_static.a', `wasm32-wasi/${buildType}/libjsrust.a`];
obj.concat(STATIC_LIBS).forEach(async (obj) => {
  await fs.copy(`obj/${obj}`, `lib/${path.basename(obj)}`);
});
