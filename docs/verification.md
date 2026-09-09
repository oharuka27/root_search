# 検証記録

## Cloudflare Workers移行後（2026-09-09）

- `npm test`：10件成功。従来の距離・予算・カテゴリ判定に加え、同一Origin／Host、偽のContent-Lengthを含む実本文サイズ制限、JSON検証、レート制限キー、取得制限、no-storeヘッダーを確認。
- `npm run build`：型検査、React静的ファイルとWorkerの両方のビルドに成功。Vite 8 + Cloudflare Viteプラグインを使用。
- 開発モードの `npm run test:e2e`：3件成功、外部APIテスト1件を意図的にスキップ（HTTPガードのケース追加前の実行）。Node/Expressではなくworkerd上で動作。
- `RUN_LIVE=1 npm run test:preview`：ビルド済み構成で5件すべて成功。MCPで実OSMスポット193件を取得（件数は日時と範囲に依存）。
- ブラウザのSDK v1 Client → WorkersのAgentsハンドラー → SDK v2サーバーの初期化・tools/list・tools/callを確認。
- 自宅登録・再読込・再選択、お気に入り、別ブラウザコンテキストの保存領域分離、全データ削除を確認。MCP送信本文に自宅名・住所・正確な自宅座標が含まれないことを確認。
- 地図利用を有効にする前の外部通信がないこと、390px幅で横にはみ出さないことを確認。
- `/mcp` への画面遷移にもSPAを返さず405、`/mcp/unknown`は404、不正JSONは400、16KB超は413、非JSONは415、別Originは403を返すことをビルド済み構成で確認。
- ビルド後の `npx wrangler deploy --dry-run`：成功。Static Assets 134ファイル、Worker gzip約166 KiB、3つのRate Limitingバインディングが生成された。アップロードは行っていない。
- 依存更新後のnpm監査：既知の脆弱性0件。Miniflareのsharp依存を修正版へoverride。

Cloudflareアカウントへのログイン・実際のデプロイ・公開URLでの確認は実施していない。認証後の手順は [deployment.md](deployment.md) を参照。

この実行環境ではChromiumの一部共有ライブラリが不足していたため、以前用意した `/tmp/yorimichi-browser-libs` を検証プロセスの `LD_LIBRARY_PATH` に指定した。アプリ実行には不要。通常は `npx playwright install --with-deps chromium` で検証環境を準備できる。

## 初期ローカル版（移行前）

2026-09-09に距離計算等5件とブラウザ／実MCP通信4件、ビルドが成功。上記のWorkers移行後の結果が現在の構成に対する記録。

道路に沿う徒歩経路の計算、任意住所の自動ジオコーディング、各施設の営業状況確認は実装対象外。画面で概算・対応範囲・データ源を明示している。
