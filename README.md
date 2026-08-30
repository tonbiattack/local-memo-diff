# memo / diff

> **memo / diff** is a lightweight memo and text-diff tool that runs entirely in your browser.
> **No login. No database. No backend.**

ブラウザだけで動く、ローカル保存型のメモ・差分比較アプリです。本文はこの端末・このブラウザの `localStorage` にのみ保存され、メモを2件選択して行単位の差分を確認できます。

## Demo

**[公開デモを開く](https://tonbiattack.github.io/local-memo-diff/)**

> デモで作成したメモは、アクセスしたブラウザだけに保存されます。共有端末では機密情報を保存しないでください。

## Features

| 機能                   | 内容                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| ローカルメモ           | メモの作成・編集・一覧検索を行えます。内容は自動保存されます。                                                   |
| 本文由来の自動タイトル | タイトルが未入力なら、本文の最初の非空行を見出しとして表示します。手入力のタイトルがあれば、そちらを優先します。 |
| 本文内検索             | 開いているメモ本文から文字列を検索し、一致件数の確認と前後移動ができます。                                       |
| メモ複製               | 開いているメモを内容ごと複製し、別案の編集をすぐに始められます。                                                 |
| バックアップ／復元     | 全メモをJSON形式で端末に書き出し、既存メモを消さずに別のブラウザへ追加できます。                                 |
| スナップショット       | 現在の本文を最大20件まで保存し、現在のメモや別メモと比較できます。                                               |
| 行単位Diff             | 2つのメモを選択し、追加・削除・共通行をGit風の形式で全行比較できます。                                           |
| Side-by-Side Diff      | Unified表示と左右比較表示を切り替え、変更前後を並べて確認できます。                                              |
| 差分エクスポート       | Git風プレーンテキスト（`.txt`）と、色分け・行番号付きの自己完結HTMLを出力できます。                              |
| 安全な削除             | 現在のメモの削除と全メモ削除を用意し、どちらも対象と取り消し不可を示す確認ダイアログを表示します。               |
| プライバシー重視       | ログイン、データベース、バックエンドは使用しません。メモ本文や差分を外部サーバーへ送信しません。                 |

## Tech Stack

| 領域         | 採用技術                 |
| ------------ | ------------------------ |
| UI           | React 19                 |
| 言語         | TypeScript               |
| ビルドツール | Vite 7                   |
| スタイル     | Tailwind CSS 4 / CSS     |
| 永続化       | Browser `localStorage`   |
| ホスティング | GitHub Pages             |
| CI/CD        | GitHub Actions           |
| アクセス解析 | Cloudflare Web Analytics |

## Architecture

このアプリケーションにバックエンドはありません。すべてのデータ処理と保存はブラウザ内で完結します。

```text
Browser
  ↓
React + TypeScript
  ├─ Memo editor
  ├─ In-note search
  ├─ Line-based diff engine (Unified / Side-by-Side)
  ├─ Memo duplication and snapshots
  └─ Export generator (.txt / .html)
  ↓
localStorage

Browser
  ↓
Cloudflare Web Analytics (page views only)
```

> **Data locality:** All memo data stays in the browser profile that created it.

この設計により、サーバー運用、ユーザー認証、データベース管理を不要にしています。一方で、ブラウザのサイトデータを消去するとメモも失われ、端末やブラウザをまたいだ同期は行われません。

閲覧数とページビューの把握にはCloudflare Web Analyticsを利用しています。計測スニペットはページの読み込み時だけに実行し、メモ本文・タイトル・差分を解析イベントとして送信する機能は実装していません。

## Why This Exists

軽量な下書き・比較作業には、アカウント作成やクラウド同期が必ずしも必要ではありません。`memo / diff` は、変更前後の文章を短時間で見比べ、必要なら差分をそのまま共有・保管できる、小さく独立した作業空間として作成しました。

特に、仕様メモ、議事録の推敲、リリースノート、プロンプト、設定ファイルの変更点を確認する用途を想定しています。

## Local Development

Node.js 22 以降と pnpm 10 を用意してください。プロジェクトではロックファイルに合わせるため、pnpmの利用を推奨します。

```bash
git clone https://github.com/tonbiattack/local-memo-diff.git
cd local-memo-diff
pnpm install
pnpm dev
```

開発サーバー起動後、表示されたローカルURLをブラウザで開いてください。

pnpmを使わない場合は、同等の操作をnpmでも実行できます。

```bash
npm install
npm run dev
```

### Checks and Builds

型チェックとGitHub Pages向けの静的ビルドは、次のコマンドで実行できます。

```bash
pnpm run check
pnpm run build:pages
```

`build:pages` は `dist/public` に静的ファイルを出力し、GitHub Pagesでのフォールバック用に `404.html` も生成します。

## Project Structure

```text
local-memo-diff/
├─ client/
│  ├─ public/
│  │  └─ favicon.svg             # GitHub Pages対応のSVGファビコン
│  └─ src/
│     ├─ components/
│     │  └─ DiffWorkbench.tsx    # 差分表示・エクスポート
│     ├─ lib/
│     │  ├─ diff.ts              # 行単位Diffロジック
│     │  └─ memo.ts              # メモモデル・自動タイトル
│     ├─ pages/
│     │  └─ Home.tsx             # メモ編集ワークスペース
│     └─ index.css               # UIスタイル
├─ .github/workflows/
│  └─ deploy.yml                 # GitHub Pagesデプロイ
├─ vite.config.ts                 # GitHub Pagesのbase path設定
└─ README.md
```

## Deploy to GitHub Pages

このリポジトリには、`main` ブランチへのpushでGitHub Pagesへデプロイするワークフローが含まれています。

1. GitHubで **Settings → Pages → Build and deployment → Source** を開きます。
2. **GitHub Actions** を公開元として選択します。
3. `main` ブランチへpushします。

ワークフローは型チェック、Viteビルド、Pagesアーティファクトのアップロード、デプロイを順に実行します。Viteの公開パスは、プロジェクトサイトではリポジトリ名を含むパスに自動対応します。[1] [2]

## Limitations and Privacy

| 項目         | 内容                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------- |
| 保存先       | 現在のブラウザプロファイルの `localStorage`                                                    |
| 同期         | なし。別ブラウザ・別端末には引き継がれません。                                                 |
| 消去         | ブラウザのサイトデータ削除、またはアプリ内の全メモ削除で消去されます。                         |
| 容量         | ブラウザの保存領域に依存します。大量・巨大なメモには適しません。                               |
| 推奨         | 大切なメモはJSONバックアップを端末へ定期的に保存してください。                                 |
| アクセス解析 | Cloudflare Web Analyticsで訪問数とページビューを計測します。メモの内容は計測対象に含めません。 |

## Roadmap Ideas

今後の候補として、JSONバックアップ／復元、ダークテーマ、ショートカット一覧などを検討しています。

## License

This project is licensed under the [MIT License](./LICENSE).

## References

[1]: https://docs.github.com/ja/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages "GitHub Pages のカスタムワークフロー"
[2]: https://vite.dev/guide/static-deploy "Vite — 静的サイトのデプロイ"
