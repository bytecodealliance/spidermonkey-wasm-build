#! /usr/bin/env bash
set -ex

tag_name=rev-$(cat COMMIT)
git tag $tag_name
git push origin $tag_name
