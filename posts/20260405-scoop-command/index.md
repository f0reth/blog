---
title: "Windowsのパッケージ管理ツール Scoop の使い方"
description: "Windows向けのパッケージ管理ツールScoopのインストール方法から基本的なコマンド、便利なコマンド一覧をまとめました。"
published_at: "2026-04-05"
modified:
published: true
tags: ["windows"]
---

Windowsで開発環境を整える際、多くのツールを一つずつ公式サイトからダウンロードしてインストールするのは手間がかかります。
そんな時に便利なのが、MacのHomebrewのようにコマンドラインからツールを管理できる「Scoop」です。

この記事では、Scoopのインストール方法から主要なコマンド、バケットの追加方法まで詳しく解説します。

---

## Scoopとは？

Scoopは、Windows向けのコマンドライン・インストーラーです。
以下のような特徴があります。

- **管理者権限が不要**: ユーザーディレクトリ（デフォルトは `~/scoop`）にインストールされるため、環境を汚しにくい。
- **パスの自動通し**: インストールした実行ファイルへのパスを自動的に設定してくれます。
- **依存関係の解決**: 必要な依存ツールも一緒にインストールしてくれます。
- **簡単にアンインストール**: コマンド一つでクリーンに削除可能です。

## インストール方法

ScoopのインストールはPowerShellから行います。

### 1. 実行ポリシーの変更

まず、PowerShellでスクリプトの実行を許可する必要があります。管理者権限ではない通常のPowerShellで以下のコマンドを実行してください。

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 2. インストールコマンドの実行

次に、以下のコマンドを実行してScoopをインストールします。

```powershell
irm get.scoop.sh | iex
```

インストールが完了したら、`scoop help` と入力してヘルプが表示されれば成功です。

---

## 基本的な操作コマンド

よく使う主要なコマンドを紹介します。

### ツールの検索 (`search`)

インストールしたいツールがあるかどうかを検索します。

```powershell
scoop search <アプリ名>
```

### ツールのインストール (`install`)

ツールをインストールします。

```powershell
scoop install <アプリ名>
```
*例: `scoop install git`*

### インストール済みツールの一覧 (`list`)

現在Scoopでインストールされているツールを確認します。

```powershell
scoop list
```

### ツールの更新 (`update`)

Scoop本体やインストール済みのツールを更新します。

```powershell
# Scoop本体の更新（最新のアプリ情報を取得）
scoop update

# 特定のアプリを更新
scoop update <アプリ名>

# すべてのアプリを一括更新
scoop update *
```

### ツールのアンインストール (`uninstall`)

不要になったツールを削除します。

```powershell
scoop uninstall <アプリ名>
```

---

## バケット (Buckets) の追加

Scoopでは、アプリの配布元を「バケット」と呼びます。標準では最小限のツールしか含まれていませんが、有名な「extras」バケットを追加することで、Google ChromeやVS Codeなどもインストールできるようになります。

### おすすめのバケット追加

よく使われる `extras` バケットを追加するには以下のコマンドを実行します。

```powershell
scoop bucket add extras
```

### その他の主要バケット

- `versions`: 旧バージョンのアプリ
- `php`: PHPの各バージョン
- `nerd-fonts`: プログラミング向けのフォント
- `nirsoft`: NirSoftの便利ツール群

---

## コマンド詳細一覧

Scoopで使用できる全コマンドの一覧と、それぞれの基本的な使い方です。

### 基本操作

- **`install`**: アプリをインストールします。
  ```powershell
  scoop install <app>
  ```
- **`uninstall`**: アプリをアンインストールします。
  ```powershell
  scoop uninstall <app>
  ```
- **`search`**: 利用可能なアプリを検索します。
  ```powershell
  scoop search <query>
  ```
- **`list`**: インストール済みのアプリ一覧を表示します。
  ```powershell
  scoop list
  ```
- **`update`**: アプリやScoop自体を更新します。
  ```powershell
  scoop update [app] # 特定のアプリ
  scoop update *     # 全アプリ
  ```
- **`status`**: アプリの更新状況やエラーを確認します。
  ```powershell
  scoop status
  ```

### アプリの管理・情報

- **`info`**: アプリの詳細情報（バージョン、ウェブサイト、依存関係など）を表示します。
  ```powershell
  scoop info <app>
  ```
- **`home`**: アプリの公式サイトをブラウザで開きます。
  ```powershell
  scoop home <app>
  ```
- **`cat`**: アプリの定義ファイル（マニフェスト）の内容を表示します。
  ```powershell
  scoop cat <app>
  ```
- **`depends`**: アプリのインストールに必要な依存関係を表示します。
  ```powershell
  scoop depends <app>
  ```
- **`prefix`**: インストールされたアプリのパスを返します。
  ```powershell
  scoop prefix <app>
  ```
- **`which`**: 実行ファイル（shim）の実際の場所を確認します。
  ```powershell
  scoop which <command>
  ```

### アップデートの中止と再開

- **`hold`**: アプリの更新を無効化（固定）します。
  ```powershell
  scoop hold <app>
  ```
- **`unhold`**: アプリの更新の無効化を解除します。
  ```powershell
  scoop unhold <app>
  ```

### システム・環境管理

- **`bucket`**: バケット（リポジトリ）を管理します。
  ```powershell
  scoop bucket list            # 一覧表示
  scoop bucket add <name> [url] # 追加
  scoop bucket rm <name>        # 削除
  ```
- **`alias`**: オリジナルのエイリアス（別名）を作成・管理します。
  ```powershell
  scoop alias add <name> <cmd>
  scoop alias list
  ```
- **`config`**: Scoopの設定を取得・変更します。
  ```powershell
  scoop config proxy localhost:8080 # 例: プロキシ設定
  ```
- **`checkup`**: システムの潜在的な問題をチェックします。
  ```powershell
  scoop checkup
  ```
- **`cleanup`**: 古いバージョンのアプリを削除してディスク容量を確保します。
  ```powershell
  scoop cleanup [app]
  ```
- **`cache`**: ダウンロードキャッシュの確認や削除を行います。
  ```powershell
  scoop cache show
  scoop cache rm *
  ```
- **`reset`**: アプリの競合を解決するために設定（shim）をリセットします。
  ```powershell
  scoop reset <app>
  ```
- **`shim`**: Scoopの実行ファイル（shim）を操作します。
- **`virustotal`**: アプリのハッシュやURLをVirusTotalでチェックします。
  ```powershell
  scoop virustotal <app>
  ```

### 開発・高度な機能

- **`create`**: カスタムアプリのマニフェストを作成します。
  ```powershell
  scoop create <url>
  ```
- **`download`**: アプリをインストールせずにキャッシュフォルダにダウンロードします。
  ```powershell
  scoop download <app>
  ```
- **`export`**: インストール済みのアプリやバケットの情報をJSON形式で出力します。
  ```powershell
  scoop export > my_apps.json
  ```
- **`import`**: `export`したJSONファイルからアプリ、バケット、設定を復元します。
  ```powershell
  scoop import my_apps.json
  ```
- **`help`**: コマンドのヘルプを表示します。
  ```powershell
  scoop help <command>
  ```

---

## まとめ

Scoopを使うと、Windowsの環境構築が驚くほどスムーズになります。
特に環境変数を手動で編集しなくて済むのが大きなメリットです。
