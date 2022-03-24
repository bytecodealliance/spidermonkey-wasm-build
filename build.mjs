import { exec, execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { copyFile } from 'fs/promises';
import { basename, join } from 'path';

// TODO:
// 1. Disable js-shell in mozconfigs/{release,debug}
//    as it's not needed for the wasm embedding
// 2. Figure out why debug builds are not working;
//    when passing `--enable-debug` the clang compiler
//    complains about signal emulation not supported by WASI.
//    It's likely that this is a legit bug; mozilla's build
//    only performs release builds: https://github.com/mozilla/gecko-dev/blob/master/js/src/devtools/automation/variants/wasi

const GECKO_DEV_DIR = 'gecko-dev';
const UPSTREAM = readFileSync('UPSTREAM', 'utf-8');
const COMMIT = readFileSync('COMMIT', 'utf-8');
const BUILD_ARTIFACTS = ['obj', 'include', 'lib'];
const OBJ_FILES = readFileSync('object-files.list', 'utf-8')
  .split('\n')
  .filter(line => line.length > 0);
const BASE_PATH = process.cwd();

const buildType = process.argv[2] ?? 'release';

if (buildType !== 'release' && buildType !== 'debug') {
  console.error('Invalid argument. Must be either "release" or "debug"');
  process.exit(1);
}

BUILD_ARTIFACTS.forEach((artifact) => {
  if (existsSync(artifact)) {
    try {
      execSync(`rm -rf ${artifact}`);
    } catch (error) {
      console.error(error.stdout.toString());
      console.error(error.stderr.toString());
      process.exit(1);
    }
  }
});

if (!existsSync(GECKO_DEV_DIR)) {
  mkdirSync(GECKO_DEV_DIR);
  process.chdir(join(BASE_PATH, GECKO_DEV_DIR));

  try {
    execSync('git init');
    execSync(`git remote add origin ${UPSTREAM}`);
    execSync(`git fetch --progress --depth=1 origin ${COMMIT}`);
    execSync(`git checkout ${COMMIT}`);
  } catch (error) {
    console.error(error.stdout.toString());
    console.error(error.stderr.toString());
    process.exit(1);
  }

  process.chdir(BASE_PATH);
}

process.chdir(join(BASE_PATH, GECKO_DEV_DIR));

try {
  execSync('./mach --no-interactive bootstrap --application-choice=js');
} catch (error) {
  console.error('*** mach bootstrap error ***');
  console.error(error.stdout.toString());
  console.error(error.stderr.toString());
  process.exit(1);
}

process.env.MOZ_OBJDIR = `${BASE_PATH}/obj`;

if (buildType === 'release') {
  process.env.MOZCONFIG = `${BASE_PATH}/mozconfigs/release`;
} else {
  process.env.MOZCONFIG = `${BASE_PATH}/mozconfigs/debug`;
}

try {
  execSync('./mach build');
} catch (error) {
  console.error('*** mach build error ***');
  console.error(error.stdout.toString());
  console.error(error.stderr.toString());
  process.exit(1);
}

process.chdir(BASE_PATH);

if (!existsSync('lib')){
    mkdirSync('lib');
}

// Copy headers into final build location
execSync('cp -L -R obj/dist/include include');
execSync('cp obj/js/src/js-confdefs.h include');

// Copy object files and static libraries into final build location
const STATIC_LIBS = ['js/src/build/libjs_static.a', `wasm32-wasi/${buildType}/libjsrust.a`];
STATIC_LIBS.concat(OBJ_FILES).forEach(async (obj) => {
  await copyFile(`obj/${obj}`, `lib/${basename(obj)}`);
});

console.log('Done');

