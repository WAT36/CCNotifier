#!/bin/bash

pwd
echo '---'
ls
echo '---'

# npx ts-node src/ts/getRate.ts
# npx ts-node src/ts/updateBrandBidAsk.ts btc bid

# all update
src/allUpdateBrandBidAsk.sh

# assets compare
npx ts-node src/compareDataAndAssets.ts