#! /usr/bin/env sh
set -e
cd /usr/src/app || exit
touch .pkg.sha1
OLD_SHA=$(cat .pkg.sha1)
NEW_SHA=$(sha1sum yarn.lock)
if [ "$OLD_SHA" != "$NEW_SHA" ]; then
  echo "$NEW_SHA" > .pkg.sha1
  yarn install
  rm -rf node_modules/cp-translations
  ln -s /usr/src/cp-translations node_modules/cp-translations
fi
yarn dev
