#!/bin/bash

PWD=`pwd`
DIR=`dirname $0`
cd $DIR

source ./config.sh

failed=()
retry_count=5

for brand in "${BRANDS[@]}" ; do
    for operation in "${BIDASK[@]}" ; do
        ./updateBrandBidAsk.sh ${brand} ${operation}
        if [ $? -eq 1 ]; then
            failed+=("${brand}-${operation}")
        fi
    done
done

echo "失敗したもの-(0)↓"
echo ${failed[@]}

if [ ${#failed[@]} -ne 0 ]; then
    for i in `seq ${retry_count}`
    do
        if [ ${#failed[@]} -eq 0 ]; then
            break
        fi
        echo "--- Retry ${i} ---"
        failed_new=()
        for failedParameter in "${failed[@]}" ; do
            brandBidAsk=(${failedParameter//-/ })
            ./updateBrandBidAsk.sh ${brandBidAsk[0]} ${brandBidAsk[1]}
            if [ $? -eq 1 ]; then
                failed_new+=("${failedParameter}")
            fi
        done
        failed=(${failed_new[@]})
        echo "失敗したもの-(${i})↓"
        echo ${failed[@]}
    done
fi

cd $PWD
exit 0