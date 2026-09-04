# Implementation Plan: price-rate-history-archive

## Overview

`priceRateHistory` テーブルの古いレートデータを S3 に JSON Lines 形式でアーカイブし DB から削除する月次バッチを実装する。
実装は以下の3ステップで進める。

1. `src/archivePriceRateHistory.ts` の純粋関数・オーケストレーション関数の実装
2. `src/index.ts` へのジョブルーティング追加
3. `infra/lib/infra-stack.ts` への CDK リソース（S3・IAM・EventBridge）追加

---

## Tasks

- [x] 1. テスト環境のセットアップ
  - ルートの `package.json` に Jest + ts-jest + fast-check を devDependencies として追加する
  - `jest.config.js`（または `jest.config.ts`）をルートに作成し、`src/` 以下を対象とする ts-jest 設定を記述する
  - `tsconfig.json` に `"esModuleInterop": true` が含まれていることを確認し、必要なら追加する
  - _Requirements: 5.2（テスト基盤として全要件をカバー）_

- [x] 2. 純粋関数の実装（`src/archivePriceRateHistory.ts`）
  - [x] 2.1 `calcArchiveThreshold(now: Date): Date` を実装する
    - `now` から正確に 6ヶ月前の `Date` を返す
    - _Requirements: 1.1_

  - [ ]* 2.2 `calcArchiveThreshold` のプロパティテストを書く
    - **Property 1: 閾値は常に実行時刻の6ヶ月前である**
    - `fc.date()` で任意の `Date` を生成し、返値が `now` の UTC 年月日から正確に6ヶ月前であることを検証する
    - `// Feature: price-rate-history-archive, Property 1: 閾値は常に実行時刻の6ヶ月前である`
    - **Validates: Requirements 1.1**

  - [x] 2.3 `buildS3Key(now: Date): string` を実装する
    - `price-rate-history/YYYY/MM/price-rate-history-YYYY-MM-DD.jsonl` 形式のキーを返す（`YYYY/MM/DD` は `now` の UTC 年月日）
    - _Requirements: 2.2_

  - [ ]* 2.4 `buildS3Key` のプロパティテストを書く
    - **Property 2: S3 キーは実行日の UTC 値を正確に反映する**
    - `fc.date()` で任意の `Date` を生成し、返値が正規表現 `^price-rate-history\/\d{4}\/\d{2}\/price-rate-history-\d{4}-\d{2}-\d{2}\.jsonl$` にマッチし、かつ UTC 年月日が `now` と一致することを検証する
    - `// Feature: price-rate-history-archive, Property 2: S3 キーは実行日の UTC 値を正確に反映する`
    - **Validates: Requirements 2.2**

  - [x] 2.5 `toJsonLines(records: PriceRateHistoryRecord[]): string` を実装する
    - 各レコードを JSON 文字列に変換して改行区切りで結合する
    - `Decimal` 型は `toString()` で文字列化する
    - `null` フィールドはそのまま JSON の `null` として出力する
    - _Requirements: 1.4, 2.1_

  - [ ]* 2.6 `toJsonLines` のプロパティテストを書く（ラウンドトリップ + 行数一致）
    - **Property 3: JSON Lines シリアライズはすべての列を保持する（ラウンドトリップ）**
    - `fc.array(fc.record({id, brand, bid_price, ask_price, created_time}))` でレコード配列を生成し、行単位で `JSON.parse()` した結果が元レコードの全列と一致することを検証する
    - **Property 4: S3 キーの行数は常にレコード数と一致する**
    - 同配列を使い、末尾空行を除いた行数がレコード数 `n` と等しいことを検証する
    - `// Feature: price-rate-history-archive, Property 3: JSON Lines シリアライズはすべての列を保持する`
    - `// Feature: price-rate-history-archive, Property 4: 行数は常にレコード数と一致する`
    - **Validates: Requirements 1.4, 2.1**

  - [x] 2.7 `buildSuccessMessage(params)` を実装する
    - `archivedCount`・`s3Key`・`deletedCount` をすべて含む文字列を返す
    - _Requirements: 4.1_

  - [ ]* 2.8 `buildSuccessMessage` のプロパティテストを書く
    - **Property 5: 成功メッセージはすべての必須情報を含む**
    - `fc.integer()`・`fc.string()` でランダムな件数・キーを生成し、返値にすべての値が含まれることを検証する
    - `// Feature: price-rate-history-archive, Property 5: 成功メッセージはすべての必須情報を含む`
    - **Validates: Requirements 4.1**

- [x] 3. チェックポイント — 純粋関数のテストをすべてパスさせる
  - `npm test` を実行してすべての純粋関数テストが通ることを確認する。問題があればここで解決する。

- [x] 4. オーケストレーション関数の実装（`src/archivePriceRateHistory.ts`）
  - [~] 4.1 `archivePriceRateHistory(): Promise<void>` を実装する
    - `calcArchiveThreshold` で閾値を計算する
    - Prisma で `created_time < threshold` のレコードを `findMany` で抽出する
    - 0 件の場合は「対象データなし」の Slack 通知を送り正常終了する
    - 1 件以上の場合は `toJsonLines` で変換し、S3 に `PutObject`（`Content-Type: application/x-ndjson`）する
    - S3 失敗時は DB 削除を実行せずエラーを Slack 通知して `throw` する
    - S3 成功後、`deleteMany` で同一条件のレコードを削除する
    - DB 削除失敗時はエラーを Slack 通知して `throw` する（S3 ファイルは削除しない）
    - 正常完了時は `buildSuccessMessage` で生成したメッセージを Slack に通知する
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3_

  - [ ]* 4.2 オーケストレーション関数のモックベーステストを書く
    - Jest `jest.mock()` で Prisma クライアント・`S3Client`・`postWebhook` を差し替える
    - 以下のシナリオをカバーする:
      - **正常完了（1件以上）**: S3 PutObject → DB deleteMany の順で呼ばれること
      - **0件**: PutObject・deleteMany が呼ばれないこと、Slack に「対象データなし」が送られること
      - **S3 失敗**: DB deleteMany が呼ばれないこと、Slack エラー通知が送られること
      - **DB 削除失敗**: Slack エラー通知が送られること
    - _Requirements: 1.3, 2.4, 3.2, 3.3, 4.2, 4.3_

- [x] 5. `src/index.ts` へのルーティング追加
  - [~] 5.1 `archivePriceRateHistory` を `src/index.ts` にインポートし、既存の `else if` チェーンに `job === 'archivePriceRateHistory'` の分岐を追加する
    - 追加位置は `sneaker` の分岐と `else`（`allRateCheckAndPost`）の間
    - _Requirements: 5.2_

  - [ ]* 5.2 ルーティングのユニットテストを書く
    - `{ job: 'archivePriceRateHistory' }` イベントで `archivePriceRateHistory()` が呼ばれることを検証する
    - _Requirements: 5.2_

- [x] 6. CDK インフラの実装（`infra/lib/infra-stack.ts`）
  - [~] 6.1 `Archive_Bucket`（`ccnotifier-price-rate-archive`）を追加する
    - `blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL`
    - `removalPolicy: RemovalPolicy.RETAIN`
    - ライフサイクルルール: オブジェクト作成から 365 日後に `GLACIER` へ移行
    - _Requirements: 6.1, 6.2, 6.4_

  - [x] 6.2 Lambda ロールに `Archive_Bucket` への `s3:PutObject` ポリシーを追加する
    - 対象リソース: `archiveBucket.bucketArn + '/*'`
    - _Requirements: 6.3_

  - [x] 6.3 月次 EventBridge ルールを追加する
    - cron 式: `cron(2,0,1,*,?,*)`（毎月1日 UTC 0:02）
    - ターゲット入力: `{ job: 'archivePriceRateHistory' }`
    - _Requirements: 5.1, 5.3_

  - [ ]* 6.4 CDK スナップショットテストを書く（`infra/test/infra.test.ts`）
    - 以下を検証する:
      - `Archive_Bucket` に `BlockPublicAccess: ALL` が設定されていること
      - `Archive_Bucket` にライフサイクルルール（GLACIER 移行 365 日）が設定されていること
      - Lambda ロールに `s3:PutObject` 権限が付与されていること
      - EventBridge ルールの cron 式が `cron(2,0,1,*,?,*)` であること
      - Lambda ターゲット入力に `{ "job": "archivePriceRateHistory" }` が設定されていること
    - _Requirements: 5.1, 5.3, 6.1, 6.2, 6.3, 6.4_

- [x] 7. 最終チェックポイント — すべてのテストをパスさせる
  - ルートで `npm test`、infra で `npm run test` を実行してすべてのテストが通ることを確認する。問題があればここで解決する。

---

## Notes

- `*` が付いたサブタスクはオプションであり、MVP として先行リリースする場合はスキップ可能
- 各タスクには対応する要件番号を明記している
- タスク 1 のテスト環境セットアップはすべてのテストタスクの前提条件であり、必ず最初に実施すること
- CDK スナップショットテスト（6.4）には `@aws-cdk/assertions` を使用する（`infra/` の既存 devDependencies に含まれている）
- `ARCHIVE_BUCKET_NAME` を Lambda 環境変数として追加し、`archivePriceRateHistory.ts` 内で参照する設計を推奨する

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.3", "2.5", "2.7"] },
    { "id": 2, "tasks": ["2.2", "2.4", "2.6", "2.8"] },
    { "id": 3, "tasks": ["4.1", "6.1", "6.2", "6.3"] },
    { "id": 4, "tasks": ["4.2", "5.1", "6.4"] },
    { "id": 5, "tasks": ["5.2"] }
  ]
}
```
