#!/bin/bash

source src/config.sh

PWD=`pwd`
DIR=`dirname $0`
cd $DIR

for brand in "${BRANDS[@]}" ; do
    npx ts-node ./ts/isSellTime.ts ${brand}
done

cd $PWD
exit 0