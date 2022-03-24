#! /usr/bin/env bash
set -ex

rev=$(cat COMMIT)
asset=spidermonkey-wasm.tar.gz

curl --fail -L -O \
https://github.com/bytecodealliance/spidermonkey-wasm-build/releases/download/rev-$rev/$asset

rm -rf release-build
mkdir release-build

tar xf $asset -C release-build
rm -rf $asset


asset_debug=spidermonkey-wasm-debug.tar.gz

curl --fail -L -O \
https://github.com/bytecodealliance/spidermonkey-wasm-build/releases/download/rev-$rev/$asset_debug

rm -rf debug-build
mkdir debug-build

tar xf $asset_debug -C debug-build
rm -rf $asset_debug
