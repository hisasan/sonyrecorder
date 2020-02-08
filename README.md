# sonyrecorder
SONY社製のBDレコーダーを制御するモジュールです。今のところ電源ONとチャネル変更、リモコンキー操作しかできません。電源OFFはBDレコーダーがまわりの機器にあわせて勝手にしてくれるので実装していません。

## 使用方法

### 初期化

```JavaScript
const sonyrecorder_factory('sonyrecorder');
const sony = new sonyrecorder_factory('BDZ-ET2200', 'Aori');
```
BDレコーダー側で通信を許可する操作が必要です。おそらく初期化後、一度チャネル変更操作を行うと、チャネル変更は行われませんが、BDレコーダーの通信許可するUI部に接続を試みた機器名称が表示されます。
その名称の機器に許可を行えば、以降はその機器からの通信で制御可能となります。上記初期化では、'Aori'という機器名称を名乗るよう指定しています。

### 電源ON

```JavaScript
await sony.powerOn();
```
WOLでスタンバイにした後、電源ON状態にもっていきます。

### チャネル変更

```JavaScript
async function setChannel(BroadcastType, ServiceID) {
    // BDレコーダー検索
    await sony.discover();
    await sony.setChannel(BroadcastType, ServiceID);
}
setChannel('2', '2056');
```
BDレコーダーの検索は、初期化時に指定したモデル名のものをUPnPで探します。

チャネルに指定する2つの引数は、BroadcastTypeが放送の種類、ServiceIDがチャネルを示すようです。

|BroadcastType|放送の種類|
|:---:|:----|
|'2'|地デジ|
|'3'|BS|
|'4'|CS|

BSとCSの場合はServiceIDはチャネル番号そのままを指定すれば良いようですが、
地デジの場合は値にどういった意味があるのかよくわかっていません。うちでは地デジは下記のような値となっていますが、誰か意味知りませんか？

|ServiceID|局|
|:----:|:----|
|'45056'|NHK|
|'2056'|NHK-Eテレ|
|'2064'|毎日|
|'42032'|KBS京都|
|'2072'|朝日|
|'41008'|テレビ大阪|
|'2080'|関テレ|
|'45104'|奈良テレビ|
|'2089'|読売|

### リモコンキー操作

```Javascript
async function remoteKey(key) {
    // BDレコーダー検索
    await sony.discover();
    await sony.remoteKey(key);
}
remoteKey('PLAY');
```
リモコンキー操作を行います。キーコードは文字列で指定します。
使用可能なキーコードは下表のようになります。

|キーコード|キー名称|
|:----|:--------------------------------------|
|'POWER'|電源|
|'HOME'|ホーム|
|'BACK'|戻る|
|'UP'|カーソル上|
|'DOWN'|カーソル下|
|'LEFT'|カーソル左|
|'RIGHT'|カーソル右|
|'EXEC'|実行|
|'CLEAR'|削除|
|'AUDIO_SELECT'|音声切換|
|'PROGRAM_LIST'|番組表|
|'TITLE_INFO'|番組説明|
|'TOOL'|オプション|
|'DVD_MENU'|ポップアップ/メニュー|
|'CORNER_LIST'|もくじでジャンプ|
|'CAPTION_SELECT'|字幕|
|'MARK'|チャプター書込み|
|'INPUT_SELECT'|入力切換|
|'START_MENU'|らくらくスタート|
|'DISPLAY'|画面表示|
|'D'|dボタン|
|'DTRR'|地デジ|
|'BS'|BS|
|'CS'|CS|
|'CH_DOWN'|チャンネル-|
|'CH_UP'|チャンネル+|
|'BS_10KEY'|10キー|
|'10_KEY_1'|1|
|'10_KEY_2'|2|
|'10_KEY_3'|3|
|'10_KEY_4'|4|
|'10_KEY_5'|5|
|'10_KEY_6'|6|
|'10_KEY_7'|7|
|'10_KEY_8'|8|
|'10_KEY_9'|9|
|'10_KEY_0'|10|
|'10_KEY_11'|11|
|'10_KEY_12'|12|
|'BLUE'|青|
|'RED'|赤|
|'GREEN'|緑|
|'YELLOW'|黄|
|'REC'|録画|
|'PLAY'|再生|
|'FR'|早送り|
|'FF'|巻き戻し|
|'PAUSE'|一時停止|
|'PLAY_STOP'|停止|
|'REPLAY'|戻る（数秒戻る）|
|'SKIP'|スキップ（数秒進む）|
|'PREV'|前|
|'NEXT'|次|
|'OPEN_CLOSE'|ディスクトレイ開閉|

## 使用環境
以下のような環境で使用しています。

|項目|内容|
|:----|:--------------------------------------|
|ホスト|Raspberry Pi 3B+ Raspbian Stretch Lite|
|BDレコーダー|SONY社製BDZ-ET2200|
