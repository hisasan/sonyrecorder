# sonyrecorder
SONY社製のBDレコーダーを制御するモジュールです。今のところチャネル変更しかできません。電源ON/OFFはBDレコーダーがまわりの機器にあわせて勝手にしてくれるので実装していません。

## 使用方法

### 初期化

```JavaScript
const sonyrecorder_factory('sonyrecorder');
const sony = new sonyrecorder_factory('BDZ-ET2200', 'Aori');
```
BDレコーダー側で通信を許可する操作が必要です。おそらく初期化後、一度チャネル変更操作を行うと、チャネル変更は行われませんが、BDレコーダーの通信許可するUI部に接続を試みた機器名称が表示されます。
その名称の機器に許可を行えば、以降はその機器からの通信で制御可能となります。上記初期化では、'Aori'という機器名称を名乗るよう指定しています。

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

チャネルに指定する2つの引数はどういった意味があるのかよくわかっていません。うちでは地上波は下記のような値となっていますが、誰か意味知りませんか？

|BroadcastType|ServiceID|局|
|:---:|:----:|:----|
|'2'|'45056'|NHK|
|'2'|'2056'|NHK-Eテレ|
|'2'|'2064'|毎日|
|'2'|'42032'|KBS京都|
|'2'|'2072'|朝日|
|'2'|'41008'|テレビ大阪|
|'2'|'2080'|関テレ|
|'2'|'45104'|奈良テレビ|
|'2'|'2089'|読売|

## 使用環境
以下のような環境で使用しています。

|項目|内容|
|:----|:--------------------------------------|
|ホスト|Raspberry Pi 3B+ Raspbian Stretch Lite|
|BDレコーダー|SONY社製BDZ-ET2200|
