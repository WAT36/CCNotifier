#!/bin/bash

pwd
echo '---'
ls
echo '---'

# npx ts-node src/ts/getRate.ts
# npx ts-node src/ts/updateBrandBidAsk.ts btc bid

# all update
if [ -n "$ALLUPDATE" ] ; then
    src/allUpdateBrandBidAsk.sh
fi

# assets compare
npx ts-node src/ts/compareDataAndAssets.ts