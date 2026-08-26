# memo / diff

**memo / diff** は、ブラウザの `localStorage` だけで動作する React + Vite 製のメモアプリです。データベース、ログイン、バックエンドを使わず、メモを2件選んで行単位で比較できます。差分は Git 風のプレーンテキスト、または全文を確認しやすい単体HTMLファイルとして書き出せます。

## 主な機能

| 機能 | 内容 |
| --- | --- |
| ローカルメモ | 作成・編集・検索・削除ができ、すべて現在のブラウザの `localStorage` に保存されます。 |
| 自動保存 | 編集内容は変更時に端末内へ保存されます。`Ctrl` / `Cmd` + `S` では保存済み状態を確認できます。 |
| 行単位の比較 | 2つのメモを比較し、追加行・削除行・共通行を Git 風に全行表示します。 |
| `.txt` 出力 | `--- a/...` と `+++ b/...` ヘッダ、および `+` / `-` / 半角スペースを含む差分テキストを保存します。 |
| HTML出力 | 追加・削除の背景色、左右の行番号、全行を含む自己完結型HTMLを保存します。WinMergeのようにブラウザで開き、そのまま印刷もできます。 |

> **プライバシーに関する注意:** 保存先は現在のブラウザプロファイルです。ブラウザのサイトデータを消去するとメモも失われます。端末・ブラウザ間の同期は行いません。

## ローカルで実行する

Node.js 22 以降と pnpm 10 を用意し、以下を実行します。

```bash
pnpm install
pnpm dev
```

型チェックとGitHub Pages向けの静的ビルドは次のとおりです。

```bash
pnpm run check
pnpm run build:pages
```

生成物は `dist/public` に配置されます。`build:pages` は `404.html` も作るため、GitHub Pagesで未知のパスにアクセスした際にもアプリのエントリポイントを返せます。

## GitHub Pagesへの公開手順

リポジトリへこのプロジェクトをプッシュした後、GitHubの **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選択してください。`main` ブランチへのプッシュで `.github/workflows/deploy.yml` が実行され、`dist/public` をPagesアーティファクトとして公開します。[1] [2]

この設定は、通常のプロジェクトサイト（`https://<owner>.github.io/<repository>/`）ではリポジトリ名をViteの `base` に自動反映します。ユーザーまたは組織のルートサイト（`<owner>.github.io`）の場合は `/` を利用します。[2]

| 項目 | 設定済みの内容 |
| --- | --- |
| 起動条件 | `main` への push、または Actions タブからの手動実行 |
| Node.js | 22 |
| パッケージ管理 | pnpm 10、ロックファイル固定インストール |
| 静的ビルド | `pnpm run check` と `pnpm run build:pages` |
| 公開対象 | `dist/public` |

## データ構造と制約

各メモはID、タイトル、本文、作成日時、更新日時を持つJSONとして `localStorage` に格納します。差分はブラウザ内で最長共通部分列（LCS）を使って算出し、比較結果や本文が外部へ送信されることはありません。

ただし、ブラウザの保存領域には容量上限があり、大量・巨大なメモの保存には適していません。重要な内容は、HTMLまたはテキストとして定期的にエクスポートしてください。

## 参照資料

[1]: https://docs.github.com/ja/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages "GitHub Pages のカスタムワークフロー"
[2]: https://vite.dev/guide/static-deploy "Vite — 静的サイトのデプロイ"
