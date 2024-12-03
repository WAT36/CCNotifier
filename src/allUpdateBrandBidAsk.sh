#!/bin/bash

source ./config.sh

PWD=`pwd`
DIR=`dirname $0`
cd $DIR

for brand in "${BRANDS[@]}" ; do
    for operation in "${BIDASK[@]}" ; do
        ./updateBrandBidAsk.sh ${brand} ${operation}
    done
done

cd $PWD
exit 0