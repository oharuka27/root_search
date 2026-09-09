# よりみち

大阪市周辺の公園・喫茶店・猫カフェを、出発地と目的地の途中に提案するReact + 地図 + MCPアプリです。Reactの静的ファイルとMCPサーバーを **Cloudflare Workersへまとめてデプロイ**します。

## ローカル起動

Node.js 22.12以上（24 LTS推奨）。

```sh
npm ci
npm run dev
```

http://127.0.0.1:5173 を開きます。公式Cloudflare ViteプラグインがWorkersランタイム（workerd）も起動するため、別のNode.jsサーバーは不要です。

ビルド済み構成の確認：

```sh
npm run build
npm run preview
```

http://127.0.0.1:4173 を開きます。開発版・プレビュー版・公開版はオリジンが異なるため、ブラウザの保存データはそれぞれ独立しています。

## Cloudflareへ公開

```sh
npx wrangler login
npm run deploy
```

認証済みのCloudflareアカウントに `yorimichi` Workerを作成／更新します。公開先はコマンドが出力する `https://yorimichi.<account-subdomain>.workers.dev` です。既存の同名Workerがある場合は、先に `wrangler.jsonc` の `name` を変更してください。

公開せずに生成物を検証する場合：

```sh
npm run deploy:check
```

GitHub連携・カスタムドメイン・設定の詳細は **[docs/deployment.md](docs/deployment.md)** を参照してください。GitHub Pagesではなく、Cloudflare Workers Buildsにリポジトリを接続します。

## 使い方

1. 出発地・目的地を選択。検索は収録済みの大阪の主要地点を対象にします。
2. 任意の住所は「住所指定」で名前・住所を入力し、地図または緯度・経度で位置を指定。
3. 公園・喫茶店・猫スポットと、滞在を含む追加時間を選択。
4. 「寄り道をさがす」を押すとMCPを経由して候補を取得。
5. サンプルの喫茶店・猫カフェは架空です。実際の施設を探す場合は外部地図サービスを有効にし、「OpenStreetMapから取得」を選んで検索。
6. 候補を選択し、Google Mapsへのリンクから実際の徒歩道順を確認。

自宅・履歴・お気に入りはブラウザ内に保存します。同じブラウザプロファイルを共有する人とはデータも共有されるため、利用者ごとにプロファイルを分けてください。住所の自動ジオコーディングや道路経路計算はありません。所要時間と距離は概算です。

## MCPと保存

同じオリジンの `/mcp` にStreamable HTTPで接続し、`find_spots` ツールを呼びます。Workers用の公式AgentsハンドラーとMCP SDK v2サーバーを利用し、ブラウザのSDK v1クライアントとの互換通信を検証しています。

住所・自宅の正確な座標・履歴はMCPへ送りません。MCPには0.01度単位で丸めた検索範囲を送信します。D1・KV・R2・Durable Objectsは利用しません。公開時にはCloudflareがリクエストを処理し、接続元IPから生成した日単位のハッシュをレート制限用に使います。これは認証や完全な匿名化ではありません。

## 検証

```sh
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
npm run test:preview
npm run deploy:check
```

外部の実スポット取得も検証する場合は `RUN_LIVE=1 npm run test:preview` を実行します（POSIXシェル）。通常のテストは外部APIの可用性に依存しません。

- [設計方針](docs/design.md)
- [公開手順](docs/deployment.md)
- [検証記録](docs/verification.md)
