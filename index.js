'use strict';

const Client    = require('node-ssdp').Client;
const http      = require('http');
const wol       = require('wakeonlan');
const jsdom     = require('jsdom');
const { JSDOM } = jsdom;

// wait
async function wait(m) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, m);
    });
}

// XMLの指定タグの要素を得る
function getXMLTag(xml, tag) {
    const dom = new JSDOM(xml);
    const result = dom.window.document.querySelector(tag);
    if (result == null) {
        return '';
    }
    return result.textContent;
}

var sonyrecorder = function(model, clientName, mac) {
    this.address    = null;
    this.port       = 0;
    this.location   = '';
    this.model      = model;
    this.clientName = clientName;
    this.mac        = mac;
};

// レコーダーをWOLでディープスタンバイからスタンバイに
sonyrecorder.prototype.wakeonlan = function() {
    return wol(this.mac);
}

// レコーダーをUPnPで検索
sonyrecorder.prototype.discover = function() {
    return new Promise((resolve, reject) => {
        let client = new Client();

        client.on('response', (headers) => {
            const info = 'X-AV-CLIENT-INFO';
            if (headers.hasOwnProperty(info)) {
                if (headers[info].match(this.model)) {
                    clearTimeout(timer);
                    this.location = headers.LOCATION;
                    let m = this.location.match(/[a-z]:[/][/]([0-9¥.]+):([0-9]+)/);
                    if (m) {
                        this.address = m[1];
                        this.port    = m[2];
                        resolve(true);
                    } else {
                        reject(new Error("can't parse recorder location."));
                    }
                }
            }
        });

        let timer = setTimeout(() => {
            reject(new Error(`discover timeout ${this.model}`));
        }, 3000);

        client.search('urn:schemas-upnp-org:device:MediaServer:1');
    });
};

// レコーダーにコマンドを送信
// httpのステータスコードが200であれば正常応答としてそのbodyを返す
sonyrecorder.prototype.postCommand = function(post_data) {
    return new Promise((resolve, reject) => {
        // POST設定
        let post_options = {
            host: this.address,
            port: this.port,
            path: '/X_PvrControl',
            method: 'POST',
            headers: {
                'SOAPACTION': '"urn:schemas-s-bras-org:service:X_PvrControl:1#X_ChangeLiveCh"',
                'X-Telepathy-DLNAProxy-DMP': 'TV SideView',
                'User-Agent': 'TVSideView/5.8.0 CFNetwork/976 Darwin/18.2.0',
                'X-AV-Client-Info': 'av=5.0; cn="Sony Corporation"; mn="' + this.clientName + '"; mv="5.8.0"',
                'Content-Type': 'text/xml; charset="utf-8"',
                'Content-Length': Buffer.byteLength(post_data)
            }
        };

        // POSTリクエスト
        // このリクエストはレコーダー側のホームネットワーク設定でリクエスト元を
        // 登録しておかないと、失敗するので注意
        let post_req = http.request(post_options, (res) => {
            res.setEncoding('utf8');
            res.on('data', (d) => {
                if (res.statusCode == 200) {
                    resolve(d);
                } else {
                    reject(d);
                }
            });
        });

        // POSTデータ転送
        post_req.write(post_data);
        post_req.end();
    });
}

// レコーダーの状態取得
// 得られるレスポンス
//<?xml version="1.0"?>
//<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
//  <s:Body>
//    <u:X_GetPlayStatusResponse xmlns:u="urn:schemas-s-bras-org:service:X_PvrControl:1">
//      <Result>&lt;?xml version=&quot;1.0&quot;?&gt;&lt;xsrs xmlns=&quot;urn:schemas-xsrs-org:metadata-1-0/x_srs/&quot;&gt;&lt;powerstatus&gt;PowerInternalOn&lt;/powerstatus&gt;&lt;playstatus&gt;Stopped&lt;/playstatus&gt;&lt;/xsrs&gt;</Result>
//      </Result>
//    </u:X_GetPlayStatusResponse>
//  </s:Body>
//</s:Envelope>
// Resultタグの要素に埋め込まれているxmlで現在の電源状態、再生状態が得られる
// powsetstatus: PowerInternalOn=スタンバイ, PowerTransingOn=起動途中, PowerOn=電源ON
// playstatus:   Stopped=停止
sonyrecorder.prototype.getStatus = function() {
    return this.postCommand(
            '<?xml version="1.0" encoding="utf-8"?>' +
            '<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">' +
                '<s:Body>' +
                    '<u:X_GetPlayStatus xmlns:u="urn:schemas-s-bras-org:service:X_PvrControl:1">' +
                    '</u:X_GetPlayStatus>' +
                '</s:Body>' +
            '</s:Envelope>'
    );
}

// レコーダーをスタンバイから電源ONに
// 得られるレスポンス
//<?xml version="1.0"?>
//<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
//  <s:Body>
//    <u:X_PowerControlResponse xmlns:u="urn:schemas-s-bras-org:service:X_PvrControl:1">
//      <Result>&lt;?xml version=&quot;1.0&quot;?&gt;&lt;xsrs xmlns=&quot;urn:schemas-xsrs-org:metadata-1-0/x_srs/&quot;&gt;&lt;powerstatus&gt;PowerInternalOn&lt;/powerstatus&gt;&lt;/xsrs&gt;</Result>
//    </u:X_PowerControlResponse>
//  </s:Body>
//</s:Envelope>
// Resultタグの要素に埋め込まれているxmlで現在の電源状態が得られる
// powsetstatus: PowerInternalOn=スタンバイ, PowerTransingOn=起動途中, PowerOn=電源ON
sonyrecorder.prototype.powerOn = function() {
    return this.postCommand(
        '<?xml version="1.0" encoding="utf-8"?>' +
        '<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">' +
            '<s:Body>' +
                '<u:X_PowerControl xmlns:u="urn:schemas-s-bras-org:service:X_PvrControl:1">' +
                    '<Operation>on</Operation>' +
                '</u:X_PowerControl>' +
            '</s:Body>' +
        '</s:Envelope>'
    );
}

// レコーダのチャネルを変更する
// 得られるレスポンス
//<?xml version="1.0"?>
//<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
//  <s:Body>
//    <u:X_ChangeLiveChResponse xmlns:u="urn:schemas-s-bras-org:service:X_PvrControl:1">
//    </u:X_ChangeLiveChResponse>
//  </s:Body>
//</s:Envelope>
sonyrecorder.prototype.setChannel = function(BroadcastType, ServiceID) {
    return this.postCommand(
        '<?xml version="1.0" encoding="utf-8"?>' +
            '<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">' +
                '<s:Body>' +
                    '<u:X_ChangeLiveCh xmlns:u="urn:schemas-s-bras-org:service:X_PvrControl:1">' +
                    '<BroadcastType>' + BroadcastType + '</BroadcastType>' +
                    '<ServiceID>' + ServiceID + '</ServiceID>' +
                    '</u:X_ChangeLiveCh>' + 
                '</s:Body>' +
            '</s:Envelope>'
    );
};

// レコーダーを起動させる
// レコーダーの状態がディープスタンバイでも、スタンバイでも起動する
sonyrecorder.prototype.autoPowerOn = async function() {
    const start = Date.now();
    let discover = false;
    let powerstatus;

    while (powerstatus != 'PowerOn' && (Date.now() - start) < 30000) {
        if (discover == false) {
            // UPnPで検索できるようになるまでWOLする
            try {
                discover = await this.discover();
            } catch (e) {
                this.wakeonlan();
                continue;
            }
        }
        // レコーダーの電源状態がPowerOnになるまで待つ
        powerstatus = getXMLTag(getXMLTag(await this.getStatus(), 'Result'), 'powerstatus');
        switch (powerstatus)
        {
        case 'PowerInternalOn':
            // スタンバイの場合は電源ONを試みる
            await this.powerOn();
            await wait(1000);
            break;
        case 'PowerTransingOn':
            // 起動途中は待つだけ
            await wait(1000);
            break;
        }
    }

    if (powerstatus != 'PowerOn') {
        // リトライオーバー
        throw 'autoPowerOn error';
    }

    return true;
}

module.exports = sonyrecorder;
