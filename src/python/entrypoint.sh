#!/bin/bash
# Xvfbをバックグラウンドで起動
Xvfb :99 -screen 0 1280x1024x24 &

# DISPLAY環境変数を設定
export DISPLAY=:99

# Lambdaのエントリーポイントを実行
exec "$@"