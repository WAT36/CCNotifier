#!/bin/bash

# all update
echo '---'
if [ -n "$ALLUPDATE" ] ; then
    src/allUpdateBrandBidAsk.sh
fi

npx ts-node src/ts/entrypoint.ts
