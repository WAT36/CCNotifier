#!/bin/bash

# 引数の数が２つかチェックする
if [ "$#" -ne 2 ]; then
  echo "Error: Usage $0 brand bid/ask"
  exit 1
fi

BRAND=$1
BIDASK=$2

PWD=`pwd`
DIR=`dirname $0`
cd $DIR

# pythonスクリプト実行し値取得
echo "--- getShopRate start ---"
rate=$(python3 python/getShopRate.py ${BRAND} ${BIDASK})
echo "--- getShopRate end   ---"
if [ $rate = '' ]; then
  echo "Error: Python Failed. Try again!"
  cd $PWD
  exit 1
fi

# tsバッチ実行し値をDBに登録
echo "--- updateBrandBidAsk start ---"
npx ts-node ts/updateBrandBidAsk.ts ${BRAND} ${BIDASK} ${rate}
echo "--- updateBrandBidAsk end   ---"
rc=$?
if [ $rc -ne 0 ]; then
  echo "Error occured in ts."
  cd $PWD
  exit 1
fi

echo "--- Completed!! ${BRAND}-${BIDASK}     ---"
cd $PWD
exit 0