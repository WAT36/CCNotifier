# Requirements Document

## Introduction

`priceRateHistory` テーブルには、各仮想通貨銘柄のレートデータが毎時蓄積される。
データ量が増大するにつれてクエリ性能が低下するリスクがあるため、実行時点から6ヶ月以上前のデータを S3 に JSON Lines 形式でアーカイブし、DB から削除する定期バッチを新設する。

このバッチは AWS EventBridge によって毎月1日の 0:02（JST）に自動実行され、既存の Lambda エントリポイント（`src/index.ts`）で `job: 'archivePriceRateHistory'` として受け付ける。
アーカイブ先 S3 バケットは専用の新規バケットとし、CDK で管理する。

---

## Glossary

- **Archive_Batch**: `priceRateHistory` テーブルの古いレートデータを S3 に書き出し、DB から削除するバッチ処理
- **Archive_Bucket**: アーカイブデータを保存する専用 S3 バケット（`ccnotifier-price-rate-archive`）
- **Archive_File**: S3 に保存される JSON Lines 形式のアーカイブファイル（1バッチ実行につき1ファイル）
- **Archive_Threshold**: アーカイブ対象とみなす基準日時。バッチ実行時刻から6ヶ月前
- **priceRateHistory**: 各銘柄のレート（bid/ask）と記録日時を保持する PostgreSQL テーブル
- **Slack_Notifier**: `postWebhook` 関数を用いた Slack Webhook 通知モジュール

---

## Requirements

### Requirement 1: アーカイブ対象データの抽出

**User Story:** 管理者として、DB の肥大化を防ぐために、古いレートデータが自動的に特定されることを望む

#### Acceptance Criteria

1. WHEN `Archive_Batch` が実行されたとき、THE `Archive_Batch` は `Archive_Threshold`（実行時刻の6ヶ月前）を計算しなければならない
2. WHEN `Archive_Batch` が実行されたとき、THE `Archive_Batch` は `priceRateHistory.created_time` が `Archive_Threshold` より過去のレコードをすべて抽出しなければならない
3. WHEN 抽出対象レコードが0件のとき、THE `Archive_Batch` はアーカイブ処理を実行せず正常終了しなければならない
4. THE `Archive_Batch` は `priceRateHistory` テーブルのすべての列（`id`, `brand`, `bid_price`, `ask_price`, `created_time`）をアーカイブ対象に含めなければならない

---

### Requirement 2: S3 へのアーカイブファイル保存

**User Story:** 管理者として、アーカイブデータを後から参照・復元できるよう、構造化されたファイルとして S3 に保存されることを望む

#### Acceptance Criteria

1. WHEN 抽出対象レコードが1件以上存在するとき、THE `Archive_Batch` は全対象レコードを JSON Lines 形式（1レコード1行、UTF-8）で `Archive_File` に書き出し、`Archive_Bucket` にアップロードしなければならない
2. THE `Archive_Batch` は `Archive_File` のキーを `price-rate-history/YYYY/MM/price-rate-history-YYYY-MM-DD.jsonl` の形式で生成しなければならない（YYYY/MM/DD はバッチ実行日の UTC 日付）
3. THE `Archive_Batch` は `Archive_File` をアップロードする際、`Content-Type: application/x-ndjson` を設定しなければならない
4. IF S3 へのアップロードが失敗したとき、THEN THE `Archive_Batch` は DB 削除処理を実行せず、エラーを Slack に通知して異常終了しなければならない

---

### Requirement 3: DB からの削除

**User Story:** 管理者として、S3 へのアーカイブが確認できた後に DB から古いデータが削除されることで、データ損失を防ぎたい

#### Acceptance Criteria

1. WHEN S3 へのアーカイブファイルのアップロードが成功したとき、THE `Archive_Batch` は抽出対象レコードと同一条件（`created_time < Archive_Threshold`）で `priceRateHistory` テーブルからレコードを削除しなければならない
2. THE `Archive_Batch` は S3 アップロード完了の確認前に DB 削除を実行してはならない
3. IF DB 削除が失敗したとき、THEN THE `Archive_Batch` はエラーを Slack に通知して異常終了しなければならない（S3 に保存済みのアーカイブファイルは削除しない）

---

### Requirement 4: 完了通知

**User Story:** 管理者として、バッチの実行結果を Slack で確認できることを望む

#### Acceptance Criteria

1. WHEN `Archive_Batch` が正常完了したとき、THE `Slack_Notifier` はアーカイブ件数・保存先 S3 キー・削除件数を含むメッセージを Slack に投稿しなければならない
2. WHEN 抽出対象レコードが0件のとき、THE `Slack_Notifier` は対象データなしの旨を含むメッセージを Slack に投稿しなければならない
3. IF `Archive_Batch` がエラーで終了したとき、THEN THE `Slack_Notifier` はエラー内容を Slack に投稿しなければならない

---

### Requirement 5: EventBridge スケジュール実行

**User Story:** 管理者として、手動操作なしにバッチが毎月自動実行されることを望む

#### Acceptance Criteria

1. THE `Archive_Batch` は EventBridge ルールによって毎月1日の 0時2分（UTC）にスケジュール実行されなければならない
2. WHEN EventBridge から `{ "job": "archivePriceRateHistory" }` のペイロードを受信したとき、THE Lambda エントリポイント（`src/index.ts`）は `Archive_Batch` を呼び出さなければならない
3. THE EventBridge ルールは既存の CDK スタック（`infra/lib/infra-stack.ts`）内に既存ルールと同一パターンで追加されなければならない

---

### Requirement 6: アーカイブ専用 S3 バケットのプロビジョニング

**User Story:** 管理者として、アーカイブデータが CSV アップロード用バケットと混在しないよう、専用バケットで管理されることを望む

#### Acceptance Criteria

1. THE CDK スタックは `ccnotifier-price-rate-archive` という名前の S3 バケット（`Archive_Bucket`）を新規作成しなければならない
2. THE `Archive_Bucket` はパブリックアクセスをすべてブロックしなければならない
3. THE CDK スタックは Lambda の実行ロールに `Archive_Bucket` への `s3:PutObject` 権限を付与しなければならない
4. THE `Archive_Bucket` は S3 ライフサイクルルールにより、オブジェクト作成から365日後に `GLACIER` ストレージクラスへ移行しなければならない
