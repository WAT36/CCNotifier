# プロジェクト構造

## ディレクトリ構成

```
CCNotifier/
├── src/                        # Lambda バックエンド（TypeScript ソース）
├── prisma/                     # Prisma スキーマ・マイグレーション
├── dist/                       # tsc コンパイル後の出力（gitignore）
├── frontend/                   # Next.js フロントエンド
│   └── src/
│       ├── app/                # Next.js App Router のページ
│       │   ├── layout.tsx      # ルートレイアウト（Geist フォント）
│       │   ├── page.tsx        # トップページ
│       │   ├── RequireAuth.tsx # 認証ガードコンポーネント
│       │   ├── login/          # ログインページ
│       │   └── mypage/         # BI ダッシュボード（保護ルート）
│       ├── components/
│       │   ├── GraphCard.tsx   # カード UI の基本単位
│       │   ├── GraphGrid.tsx   # グリッドレイアウト管理
│       │   ├── index.ts        # GraphCard・GraphGrid を再エクスポート
│       │   └── card/           # 各データカードコンポーネント
│       │       ├── Notice.tsx      # Slack 通知実行ボタン
│       │       ├── ProfitBrand.tsx # 通貨毎の利益テーブル
│       │       ├── ProfitYearly.tsx
│       │       ├── ProfitMonthly.tsx
│       │       ├── TradeCount.tsx
│       │       └── CsvUpload.tsx   # CSV ドラッグ&ドロップアップロード
│       └── lib/
│           └── cognito.ts      # CognitoUserPool インスタンスの初期化
├── infra/
│   ├── bin/infra.ts            # CDK アプリのエントリポイント
│   └── lib/
│       ├── cert-stack.ts       # ACM 証明書スタック（us-east-1）
│       └── infra-stack.ts      # メインインフラスタック
├── .github/workflows/
│   └── main.yml                # CI/CD パイプライン
├── Dockerfile                  # Lambda コンテナイメージ定義
├── docker-compose.yaml         # ローカル開発環境
└── .env                        # 環境変数（gitignore 推奨）
```

## バックエンド Lambda のソース構成（`src/`）

| ファイル | 役割 |
|---------|------|
| `index.ts` | Lambda エントリポイント。S3 イベントとスケジュールイベントを振り分け |
| `config.ts` | 監視対象の銘柄リスト等の定数設定 |
| `registerTradeHistory.ts` | CSV データを DB に登録 |
| `allUpdateShopRate.ts` | 全銘柄の販売所レートを一括取得・DB更新 |
| `allCheckSellTime.ts` | 全銘柄の売り時・買い時を一括判定 |
| `checkSellTime.ts` | 指定銘柄の売り時判定・利益計算 |
| `compareDataAndAssets.ts` | DB資産と現資産の差異チェック |
| `allRateCheckAndPost.ts` | 定期バッチ処理の手動一括実行 |
| `postWebhook.ts` | Slack Webhook への通知送信 |
| `getShopRate.ts` | 販売所レート取得 |
| `getTraderTicker.ts` | 取引所ティッカー情報取得 |
| `getAssets.ts` | 現資産情報取得 |
| `csvUpload.ts` | CSV ファイルを S3 にアップロード |
| `calcCCProfitInRange.ts` | 期間内の利益算出 |
| `calcCCTradeCountInRange.ts` | 期間内の取引回数算出 |
| `calcMinTradeRate.ts` | 最低売却レート計算 |

## コンポーネント設計パターン

フロントエンドのコンポーネントは3層構造：

1. **`GraphGrid`** — グリッドレイアウト管理（columnsPerRow でカラム数指定）
2. **`GraphCard`** — カード UI の共通ラッパー（タイトル + children）
3. **`card/` 配下** — 各データカード（ビジネスロジック・API 呼び出し）

## インポート規則

- `GraphCard`・`GraphGrid` は `@/components`（`components/index.ts`）からインポート
- `card/` 配下のコンポーネントは `@/components/card/XXX` で直接インポート
- パスエイリアス `@/` は `frontend/src/` を指す

## 認証フロー

1. `frontend/src/lib/cognito.ts` で `CognitoUserPool` を初期化（環境変数から ID を読み込み）
2. `login/page.tsx` で `CognitoUser.authenticateUser()` によりログイン処理
3. 成功時に JWT（idToken）を `localStorage` に保存
4. `RequireAuth.tsx` が `localStorage.getItem("idToken")` で認証確認し、未ログインなら `/login` にリダイレクト
5. `mypage/` 等の保護ルートは `<RequireAuth>` でラップする

## CDK スタック構成

2スタック構成（クロスリージョン参照）：

- **`CertStack`**（`us-east-1`）: CloudFront 用 ACM 証明書を発行
- **`InfraStack`**（`ap-northeast-1`）: Lambda・S3・EventBridge・API Gateway・CloudFront・Route53・Cognito の全リソース

`infra/bin/infra.ts` でスタック間の依存関係と証明書の受け渡しを管理。
