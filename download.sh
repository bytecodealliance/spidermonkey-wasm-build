#! /usr/bin/env bash
set -ex

rev=$(cat COMMIT)
asset=spidermonkey-wasm.tar.gz

curl --fail -L -O \
https://github.com/bytecodealliance/spidermonkey-wasm-build/releases/download/rev-$rev/$asset

tar xf $asset
rm -rf $asset
