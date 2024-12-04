#!/bin/bash

# npx ts-node src/ts/getRate.ts
# npx ts-node src/ts/updateBrandBidAsk.ts btc bid

# all update
echo '---'
if [ -n "$ALLUPDATE" ] ; then
    src/allUpdateBrandBidAsk.sh
fi

# assets compare
echo '---'
npx ts-node src/ts/compareDataAndAssets.ts

# check sell time
echo '---'
src/allCheckSellTime.sh
