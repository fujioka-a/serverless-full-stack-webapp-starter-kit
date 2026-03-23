# Serverless Full Stack WebApp Starter Kit
[![Build](https://github.com/aws-samples/serverless-full-stack-webapp-starter-kit/actions/workflows/build.yml/badge.svg)](https://github.com/aws-samples/serverless-full-stack-webapp-starter-kit/actions/workflows/build.yml)
[![Release](https://img.shields.io/github/v/release/aws-samples/serverless-full-stack-webapp-starter-kit)](https://github.com/aws-samples/serverless-full-stack-webapp-starter-kit/releases)

このリポジトリは、サーバーレスなフルスタック Web アプリを素早く立ち上げるためのスターターキットです。フレームワークではなく、ファイル一式をそのまま自分のアプリ用にコピーして育てていく前提の構成になっています。

サンプルアプリをそのままデプロイして動かし、その後で自分のユースケースに合わせて置き換えていく使い方を想定しています。

## このスターターキットで得られるもの

1. **動くサンプルアプリ**  
   認証、DB CRUD、非同期ジョブ、リアルタイム通知まで一通り揃った Todo アプリが入っています。AI コーディングエージェントにも人間にも読みやすい、参照実装として作られています。
2. **エンドツーエンドの型安全**  
   Prisma ORM、Zod、Server Actions、React コンポーネントのあいだで型が一貫して流れます。
3. **最初からサーバーレス**  
   月額 10 USD 未満から始めやすく、運用負荷を抑えながらスケールできます。
4. **デプロイに統合された DB マイグレーション**  
   CDK Trigger によって、CDK デプロイの中でスキーマ反映まで完結します。

詳しい背景は、以下の記事にまとまっています。

- 英語版: [the blog article](https://tmokmss.github.io/blog/posts/serverless-fullstack-webapp-architecture-2025/)
- 日本語版: [AWSの安価でスケーラブルなウェブアプリ構成 2025年度版](https://tmokmss.hatenablog.com/entry/serverless-fullstack-webapp-architecture-2025)

## サンプルアプリ

このキットには、全体構成を確認するためのシンプルな Todo アプリが含まれています。

<img align="left" width="300" src="./.serverless-full-stack-webapp-starter-kit/docs/imgs/signin.png">
サインイン / サインアップ画面は Cognito Managed Login にリダイレクトされます。
<br clear="left"/>

&nbsp;

<img align="left" width="300" src="./.serverless-full-stack-webapp-starter-kit/docs/imgs/top.png">
ログイン後は Todo の追加・削除・更新ができます。翻訳ボタンは非同期ジョブを起動し、リアルタイム通知で画面更新を促します。
<br clear="left"/>

## アーキテクチャ

![architecture](./.serverless-full-stack-webapp-starter-kit/docs/imgs/architecture.png)

| サービス | 役割 |
|---------|------|
| [Aurora PostgreSQL Serverless v2](https://aws.amazon.com/rds/aurora/serverless/) | Prisma ORM から使う RDB |
| [Next.js App Router](https://nextjs.org/docs/app) on [Lambda](https://aws.amazon.com/lambda/) | フロントエンドとバックエンドを同居 |
| [CloudFront](https://aws.amazon.com/cloudfront/) + Lambda Function URL | 配信とレスポンスストリーミング |
| [Cognito](https://aws.amazon.com/cognito/) | 認証基盤 |
| [AppSync Events](https://docs.aws.amazon.com/appsync/latest/eventapi/event-api-welcome.html) + Lambda | 非同期ジョブとリアルタイム通知 |
| [EventBridge](https://aws.amazon.com/eventbridge/) | スケジュールジョブ |
| [CloudWatch](https://aws.amazon.com/cloudwatch/) + S3 | アクセスログと各種ログ保管 |
| [CDK](https://aws.amazon.com/cdk/) | Infrastructure as Code |

全体としてサーバーレス中心の構成で、コスト効率、スケーラビリティ、運用の軽さを重視しています。

## はじめかた

前提条件:

* [Node.js](https://nodejs.org/) (>= v20)
* [Docker](https://docs.docker.com/get-docker/)
* [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) と、設定済みの IAM プロファイル

### 1. キットをコピーする

GitHub の template 機能を使うか、clone してコピーします。

```sh
git clone https://github.com/aws-samples/serverless-full-stack-webapp-starter-kit.git my-app
cd my-app
rm -rf .git && git init
# どのバージョンのキットから始めたか分かるよう、最初のコミットに残しておくと後で便利です
git add -A && git commit -m "Initial commit from serverless-full-stack-webapp-starter-kit vX.Y.Z"
```

### 2. 必要に応じて初期設定を変える

- アプリケーション名や stack name、タグを [`cdk/bin/cdk.ts`](./cdk/bin/cdk.ts) で変更する
- カスタムドメインを使う場合は [`cdk/bin/cdk.ts`](./cdk/bin/cdk.ts) で設定する
- `cdk.context.json` を `cdk/.gitignore` から外して commit することを検討する
- migration 履歴を明示管理したいなら `prisma db push` から `prisma migrate` へ切り替える

### 3. デプロイする

```sh
cd cdk
npm ci
npx cdk bootstrap
npx cdk deploy --all
```

初回デプロイにはおおよそ 20 分ほどかかります。成功すると、以下のような出力が表示されます。

```txt
 ✅  ServerlessWebappStarterKitStack

Outputs:
ServerlessWebappStarterKitStack.FrontendDomainName = https://web.example.com
ServerlessWebappStarterKitStack.DatabaseSecretsCommand = aws secretsmanager get-secret-value ...
ServerlessWebappStarterKitStack.DatabasePortForwardCommand = aws ssm start-session ...
```

`FrontendDomainName` に表示された URL を開くと、サンプルアプリを試せます。

`DatabasePortForwardCommand` は RDS へのローカルポートフォワードを開始するためのコマンドで、`DatabaseSecretsCommand` は Secrets Manager から DB 接続情報を取得するためのコマンドです。

### 手動で DB 接続する

デプロイ後に DB の中身を直接確認したい場合は、以下の流れで接続できます。

```sh
# 1. CDK 出力の DatabasePortForwardCommand を使ってポートフォワードを開始
aws ssm start-session --region <region> --target <instance-id> \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"portNumber":["5432"], "localPortNumber":["5433"], "host": ["<cluster-endpoint>"]}'

# 2. 別ターミナルで、CDK 出力の DatabaseSecretsCommand を使って認証情報を取得
aws secretsmanager get-secret-value --secret-id <secret-name> --region <region>

# 3. 取得したユーザー名・パスワードで接続
psql "postgresql://<username>:<password>@localhost:5433/main"
```

上のプレースホルダーを置き換える代わりに、CDK の出力に表示された `DatabasePortForwardCommand` と `DatabaseSecretsCommand` をそのまま使っても構いません。

### 4. 自分の機能を追加する

ローカル開発環境、認証パターン、非同期ジョブの追加方法、DB スキーマ更新、コーディング規約は [`AGENTS.md`](./AGENTS.md) を参照してください。

Google や Facebook などのソーシャルログインを追加したい場合は、[Add social sign-in to a user pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-configuring-federation-with-social-idp.html) を参照してください。

## メンテナンスポリシー

このキットは [Semantic Versioning](https://semver.org/) に従います。利用者は fork ではなく copy して使う前提のため、破壊的変更は長い非推奨期間を設けず、メジャーバージョン更新として導入されます。

## コスト

`us-east-1` における、コスト最適化寄りの設定での月額試算例です。

| サービス | 想定利用量 | 月額 [USD] |
|---------|-----------|-----------|
| Aurora Serverless v2 | 0.5 ACU × 2 時間/日、1GB ストレージ | 3.6 |
| Cognito | 100 MAU | 1.5 |
| AppSync Events | 月 100 イベント、ユーザーあたり月 10 時間接続 | 0.02 |
| Lambda | 1024MB × 200ms/request | 0.15 |
| Lambda@Edge | 128MB × 50ms/request | 0.09 |
| VPC | NAT Instance (t4g.nano) × 1 | 3.02 |
| EventBridge | Scheduler 100 jobs/month | 0.0001 |
| CloudFront | 1kB/request のデータ転送 | 0.01 |
| **合計** | | **8.49** |

月 100 ユーザー、1 ユーザーあたり 1000 リクエストを前提にした概算です。ユースケース次第で増減します。さらに [Free Tier](https://aws.amazon.com/free/) の範囲に収まる部分もあります。

## 削除

```sh
cd cdk
npx cdk destroy --force
```

## Maintainers
* [Kenji Kono (konokenj)](https://github.com/konokenj)

### Core contributors
* [Masashi Tomooka (tmokmss)](https://github.com/tmokmss) — original author
* [Kazuho Cryer-Shinozuka (badmintoncryer)](https://github.com/badmintoncryer)

## Contributing

貢献ルールは [CONTRIBUTING.md](./CONTRIBUTING.md) を参照してください。

人間・AI を問わず、変更前に [`.serverless-full-stack-webapp-starter-kit/design/DESIGN_PRINCIPLES.md`](./.serverless-full-stack-webapp-starter-kit/design/DESIGN_PRINCIPLES.md) を読む前提です。このファイルには、このキットの設計判断と制約がまとめられています。

## Security

セキュリティに関する案内は [CONTRIBUTING.md](./CONTRIBUTING.md#security-issue-notifications) を参照してください。

## License

このライブラリは MIT-0 License で提供されています。詳細は [`LICENSE`](./LICENSE) を参照してください。
