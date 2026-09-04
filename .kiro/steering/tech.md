# 技術スタック

## フロントエンド（`frontend/`）

| 種別 | 内容 |
|------|------|
| フレームワーク | Next.js 15.5.2（App Router） |
| UI | React 19.1.0 |
| スタイリング | Tailwind CSS v4、インライン `style jsx` |
| 認証 | `amazon-cognito-identity-js` 6.x |
| ストレージ | `@aws-sdk/client-s3`、`@aws-sdk/s3-request-presigner` |
| 言語 | TypeScript 5.x |
| ビルドツール | Turbopack（`next build --turbopack`） |
| Lint | ESLint 9 + `eslint-config-next` |

## バックエンド（ルート / Lambda）

| 種別 | 内容 |
|------|------|
| ランタイム | Node.js 18（AWS Lambda コンテナイメージ） |
| ORM | Prisma |
| 言語 | TypeScript（`tsc` → `dist/` にコンパイル） |
| エントリポイント | `dist/index.handler` |
| DB | PostgreSQL（Prisma 経由） |

## インフラ（`infra/`）

| 種別 | 内容 |
|------|------|
| IaC | AWS CDK 2.x（TypeScript） |
| テスト | Jest 29 + ts-jest |

## AWS 構成

- **ECR**: Lambda コンテナイメージ保管（最新5件保持）
- **Lambda**: ECR イメージから起動、タイムアウト 15 分、メモリ 512 MB
- **EventBridge**: 毎時 :02/:04/:06 にジョブ別でスケジュール実行（0〜16時・20〜23時）
- **S3 ×2**: CSV アップロード用 + 静的フロントエンドホスティング用
- **API Gateway**: REST API プロキシ統合（全リクエストを Lambda に転送）
- **CloudFront + Route53**: フロントエンド HTTPS 配信
- **Cognito**: ユーザー名/パスワード認証（セルフサインアップ無効）
- **ACM**: CloudFront 用証明書（us-east-1 の別スタックで管理）

## 環境変数

フロントエンドの必須環境変数（`NEXT_PUBLIC_` プレフィックス付き）：

```
NEXT_PUBLIC_USERPOOL_ID      # Cognito User Pool ID
NEXT_PUBLIC_APPCLIENT_ID     # Cognito App Client ID
NEXT_PUBLIC_API_BASE_URL     # API Gateway のベース URL
```

Lambda の環境変数はルートの `.env` で管理し、CDK デプロイ時に設定される。

## よく使うコマンド

### フロントエンド

```bash
cd frontend
npm run dev      # 開発サーバー起動（Turbopack、ウォッチモード）
npm run build    # 本番ビルド（静的エクスポート）
npm run start    # 本番サーバー起動
npm run lint     # ESLint 実行
```

### バックエンド（Lambda）

```bash
npm run build    # TypeScript コンパイル（tsc）
```

### インフラ（CDK）

```bash
cd infra
npm run build    # TypeScript コンパイル
npm run test     # Jest テスト実行
npm run cdk      # CDK CLI 実行
npx cdk deploy   # デプロイ
npx cdk diff     # 差分確認
```

### Docker（ローカル開発）

```bash
docker-compose up    # ローカル環境起動
docker build .       # Lambda コンテナイメージビルド
```

## CI/CD

GitHub Actions（`.github/workflows/main.yml`）が `main` ブランチへのプッシュ時に自動実行：

1. Docker イメージをビルドして ECR にプッシュ
2. Lambda のコードを最新イメージで更新
3. フロントエンドをビルドして S3 にデプロイ
4. CloudFront キャッシュ戦略：HTML はキャッシュなし、アセットは長期キャッシュ（immutable）

必要な GitHub Secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `NEXT_PUBLIC_USERPOOL_ID`, `NEXT_PUBLIC_APPCLIENT_ID`, `NEXT_PUBLIC_API_BASE_URL`
