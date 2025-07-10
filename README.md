# CCNotifier

仮想通貨定期チェック

## src ディレクトリ各ファイルの説明

- **index.ts**
  - Lambda のエントリーポイント。
    - S3 イベントを受け取ると S3 から対象のファイルを受け取り処理します。
    - 定期実行時のイベントを受け取ると現在の通貨レートを取得し Webhook（通知用 URL）に送信します。
- **registerTradeHistory.ts**
  - 取引履歴 CSV データを読み込み、DB に登録します。
- **postWebhook.ts**
  - Webhook（通知用 URL）にメッセージを送信します。
- **allUpdateShopRate.ts**
  - 全銘柄の販売所レートを一括で取得し DB に更新します。
- **getShopRate.ts**
  - API を利用して販売所レートを取得します。
- **compareDataAndAssets.ts**
  - DB に記録されている資産と、API で取得した現資産を比較し、差異があればアラートを出します。
- **getAssets.ts**
  - API を利用して現時点の資産情報を取得します。
- **allCheckSellTime.ts**
  - 全銘柄について「売り時」「買い時」を一括で判定し、メッセージとしてまとめる関数を提供します。
- **checkSellTime.ts**
  - 指定した銘柄が「売り時」かどうかを判定します。利益や現在の保有量なども計算します。
- **config.ts**
  - 監視対象の銘柄リストなど、定数設定をまとめたファイルです。
- **manualAllCheckSellTime.ts**
  - 定期バッチ処理（レート更新・資産比較・売り時判定）を手動で一括実行するための関数です。
