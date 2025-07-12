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

## データベース構造

### テーブル

#### tradeHistory

取引履歴を格納するメインテーブル。CSV から読み込まれた取引データが保存されます。

- **trade_date**: 取引日時
- **settlement_category**: 決済カテゴリ（販売所取引など）
- **yen_payment**: 円支払額
- **order_id**: 注文 ID
- **contract_id**: 約定 ID
- **position_id**: ポジション ID
- **brand**: 銘柄名
- **order_type**: 注文タイプ
- **trade_category**: 取引カテゴリ
- **buysell_category**: 売買カテゴリ（買/売）
- **ioc_category**: IOC カテゴリ
- **contract_amount**: 約定数量
- **contract_rate**: 約定レート
- **contract_payment**: 約定支払額
- **order_commission**: 注文手数料
- **leverage_commission**: レバレッジ手数料
- **deposit_withdrawal_category**: 入出金カテゴリ
- **deposit_withdrawal_amount**: 入出金額
- **givetake_category**: 送受カテゴリ（送付/受取）
- **givetake_amount**: 送受額
- **sending_commission**: 送金手数料
- **sender**: 送信者
- **transaction_id**: トランザクション ID

#### brandBidAsk

銘柄の買い注文価格（bid）と売り注文価格（ask）を管理するテーブル。

- **brand**: 銘柄名（主キー）
- **bid_price**: 買い注文価格
- **ask_price**: 売り注文価格
- **bid_updated_time**: 買い価格更新時刻
- **ask_updated_time**: 売り価格更新時刻

#### brandId

銘柄名と ID のマッピングテーブル。

- **name**: 銘柄名（主キー）
- **id**: 銘柄 ID

### ビュー

#### brand

取引履歴から抽出された銘柄一覧。各銘柄の基本情報を提供します。

#### latest_shop_trade

各銘柄の最新の販売所取引情報を表示。販売所取引に限定し、取引日時が最新のレコードを取得します。

#### latest_shop_sell_trade

各銘柄の最新の売り取引情報を表示。売り取引に限定し、取引日時が最新のレコードを取得します。

#### now_yen_bet

各銘柄の現在の円建て投資額を計算。最新の売り取引以降の買い取引の合計額を算出します。

#### now_amount

各銘柄の現在の保有数量を計算。売買取引と送受取引を考慮して、現在の保有量を算出します。

#### brand_all_profit

各銘柄の総利益を計算。最新の売り取引までの取引履歴から利益を算出します。

#### brand_all_tradecount

各銘柄の総取引回数を集計。取引履歴から銘柄別の取引回数をカウントします。

#### trade_year_list

取引履歴から抽出された取引年一覧。取引が行われた年を重複なく表示します。
