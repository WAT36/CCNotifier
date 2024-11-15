#!/bin/bash

brands=(
    "btc"
    "eth"
    "bch"
    "ltc"
    "xrp"
    "xlm"
    "bat"
    "xtz"
    "qtum"
    "dot"
    "atom"
    "ada"
    "mkr"
    "dai"
    "link"
    "doge"
    "sol"
    "fil"
    "sand"
    "chz"
)
bidask=(
    "bid"
    "ask"
)

PWD=`pwd`
DIR=`dirname $0`
cd $DIR

for brand in "${brands[@]}" ; do
    for operation in "${bidask[@]}" ; do
        ./updateBrandBidAsk.sh ${brand} ${operation}
    done
done


cd $PWD
exit 0