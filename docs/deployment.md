# Cloudflare Workersへの公開

## 構成

- `dist/client`：React・CSS・同梱フォント・LeafletをStatic Assetsで配信。
- `dist/yorimichi`：Workers用MCPサーバー（Worker名を変更するとディレクトリ名も変わる）。
- `/mcp` と `/mcp/*` は `run_worker_first` により必ずWorkerへ渡す。SPAのHTMLにフォールバックさせない。
- `wrangler.jsonc` が設定の原本。Cloudflare Viteプラグインがビルド後の設定を生成し、Wranglerはその生成物を使用する。
- アプリデータ保存用のCloudflareリソースは不要。3つのRate Limitingバインディングのみ利用する。

## CLIで公開

1. Node.js 22.12以上を用意し、`npm ci` を実行。
2. `wrangler.jsonc` の `name` を確認。同一アカウントの同名Workerを更新するため、既存アプリと重複させない。
3. `npm run deploy:check` でビルドとデプロイ用バンドルを確認（アップロードしない）。
4. `npx wrangler login` で公開先のCloudflareアカウントに認証。
5. `npm run deploy` を実行。ReactとMCPを同時に公開する。
6. 出力された `workers.dev` URLを開き、サンプル検索を確認。地図利用を有効にし、実データ検索を確認する。

APIトークンやアカウント情報をソースコードに書かない。ローカル設定は `.dev.vars`、CIの認証はシークレットに置く。`.env*`・`.dev.vars*`・`.wrangler`・ビルド結果はGitの対象外。

## GitHubから自動公開

Cloudflareの Workers & Pages でGitリポジトリを接続し、Workers Buildsを設定する。GitHubの Settings > Pages は使用しない。

| 項目                 | 設定                                    |
| -------------------- | --------------------------------------- |
| プロジェクトのルート | このリポジトリのルート                  |
| Worker名             | `wrangler.jsonc` の `name` と一致させる |
| ビルドコマンド       | `npm run build`                         |
| デプロイコマンド     | `npx wrangler deploy`                   |
| Node.js              | 24（環境変数 `NODE_VERSION=24`）        |
| デプロイ対象         | 自分で選んだ公開用ブランチ              |

`npm run deploy` は内部でビルドも行う。Workers Buildsで上記のビルドコマンドを指定する場合、デプロイ側は `npx wrangler deploy` にすると二重ビルドを避けられる。ビルド出力ディレクトリを指定するPages式の設定は不要。

## 設定項目

| 項目                    | 既定値・用途                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `vars.OVERPASS_URL`     | `https://overpass-api.de/api/interpreter`。管理者が信頼するOverpassエンドポイント。ユーザー入力で変更できない。      |
| `vars.APP_ORIGIN`       | カスタムドメインを使う場合に追加する完全なオリジン（例：`https://walk.example.com`）。パスや末尾のスラッシュは不要。 |
| `MCP_LIMITER`           | 接続元ネットワークのハッシュごとに120リクエスト／60秒。MCP初期化・通知も含む。                                       |
| `LIVE_LIMITER`          | 同ハッシュごとに実スポット取得6回／60秒。                                                                            |
| `OVERPASS_LIMITER`      | Cloudflare拠点ごとに実スポット取得20回／60秒。                                                                       |
| `observability.enabled` | `false`。アプリによるリクエスト本文や住所のログ出力も行わない。                                                      |
| `preview_urls`          | `false`。公開先は通常のworkers.dev URLまたは明示設定したドメイン。                                                   |

レート制限はCloudflare拠点単位・結果整合であり、全世界合計の厳密な上限ではない。同じIPを共有する回線では複数利用者が同じ枠を使う。ログイン不要の公開読み取りツールであり、Originチェックやレート制限は認証ではない。利用規模が増える場合は、Overpass提供者と利用条件を確認し、必要なら専用の取得基盤やCloudflare Access等を設計する。

## カスタムドメイン

Cloudflare側でWorkerへドメインを割り当て、`wrangler.jsonc` の `vars` に `APP_ORIGIN` を追加して再ビルド・再デプロイする。ブラウザからのMCPアクセスは常に画面と同一のオリジンに限定するため、CORSで他サイトへ開放する設定はない。workers.dev URLも引き続き利用できる。

公開URL・ドメイン・ポートが変わるとlocalStorageの保存領域も変わる。以前の自宅・履歴を自動移行しない。

## プライバシーと運用の境界

自宅・住所・履歴・お気に入りは利用者のブラウザだけに保存。サーバーは大まかな検索範囲を一時的に処理する。公開版の配信・MCP通信はCloudflareを経由するため、CloudflareはIPアドレスなどの接続メタデータを処理する。日単位のIPハッシュはレート制限カウンターにのみ使い、アプリのDBへ保存しない。ハッシュは完全な匿名化ではない。

実データ検索はOverpass、地図タイルはOpenStreetMap、道順リンクを開く操作はGoogle Mapsへの通信を伴う。地図の利用設定や送信の説明は既存UIを維持する。

## 参照

- [React + Vite on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/)
- [Cloudflare Viteプラグイン](https://developers.cloudflare.com/workers/vite-plugin/tutorial/)
- [MCPハンドラー](https://developers.cloudflare.com/agents/model-context-protocol/apis/handler-api/)
- [Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
