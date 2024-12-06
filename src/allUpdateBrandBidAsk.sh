#!/bin/bash

PWD=`pwd`
DIR=`dirname $0`
cd $DIR

source ./config.sh

failed=()
for brand in "${BRANDS[@]}" ; do
    for operation in "${BIDASK[@]}" ; do
        ./updateBrandBidAsk.sh ${brand} ${operation}
        if [ $? -eq 1 ]; then
            failed+=("${brand}-${operation}")
        fi
    done
done

echo "失敗したもの↓"
echo ${failed}

cd $PWD
exit 0