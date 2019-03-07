'use strict';

const Client = require('node-ssdp').Client;
const http   = require('http');

var sonyrecorder = function(model, clientName) {
    this.address    = null;
    this.port       = 0;
    this.location   = '';
    this.model      = model;
    this.clientName = clientName;
};

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
                        resolve();
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

sonyrecorder.prototype.setChannel = function(BroadcastType, ServiceID) {
    return new Promise((resolve, reject) => {
        // コマンドデータ作成
        let post_data =
            '<?xml version="1.0" encoding="utf-8"?>' +
            '<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">' +
                '<s:Body>' +
                    '<u:X_ChangeLiveCh xmlns:u="urn:schemas-s-bras-org:service:X_PvrControl:1">' +
                    '<BroadcastType>' + BroadcastType + '</BroadcastType>' +
                    '<ServiceID>' + ServiceID + '</ServiceID>' +
                    '</u:X_ChangeLiveCh>' + 
                '</s:Body>' +
            '</s:Envelope>';

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
            res.on('data', () => {
                resolve();
            });
        });

        // POSTデータ転送
        post_req.write(post_data);
        post_req.end();
    });
};

module.exports = sonyrecorder;
