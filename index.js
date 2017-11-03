const ws = require('ws')
const events = require('events')
const request = require('request-promise')
const REQUEST_TIMEOUT = 10000
const HEARTBEAT_INTERVAL = 30000

class panda_danmu extends events {

    constructor(roomid) {
        super()
        this._roomid = roomid
    }

    async _get_chat_info() {
        let opt = {
            url: `https://riven.panda.tv/chatroom/getinfo?roomid=${this._roomid}&app=1&protocol=ws&_caller=panda-pc_web&_=${new Date().getTime()}`,
            timeout: REQUEST_TIMEOUT,
            json: true,
            gzip: true
        }
        try {
            let body = await request(opt)
            if (!body || body.errno || !body.data) {
                return null
            }
            body.data.chat_addr = body.data.chat_addr_list[0]
            delete body.data.chat_addr_list
            return body.data
        } catch (e) {
            return null
        }
    }

    async start() {
        if (this._starting) {
            return
        }
        this._starting = true
        this._chat_info = await this._get_chat_info()
        if (!this._chat_info || !this._starting) {
            this.emit('error', new Error('Fail to get chat info'))
            return this.emit('close')
        }
        this._start_ws()
    }

    _start_ws() {
        this._client = new ws(`wss://${this._chat_info.chat_addr}`, {
            origin: 'https://www.panda.tv',
            perMessageDeflate: false
        })
        this._client.on('open', () => {
            this.emit('connect')
            this._ws_bind_user()
            this._heartbeat_timer = setInterval(this._heartbeat.bind(this), HEARTBEAT_INTERVAL)
        })
        this._client.on('error', err => {
            this.emit('error', err)
        })
        this._client.on('close', () => {
            this._stop()
            this.emit('close')
        })
        this._client.on('message', this._on_msg.bind(this))
    }

    _ws_bind_user() {
        let msg = `u:${this._chat_info.rid}@${this._chat_info.appid}\nts:${this._chat_info.ts}\nsign:${this._chat_info.sign}\nauthtype:${this._chat_info.authType}\nplat:jssdk_pc_web\nversion:0.5.9`
        let buf = Buffer.concat([Buffer.from([0x00, 0x06, 0x00, 0x02, 0x00, msg.length]), Buffer.from(msg)])
        try {
            this._client.send(buf)
        } catch (err) {
            this.emit('error', err)
        }
    }

    _on_msg(msg) {
        if (msg.readInt16BE(0) !== 6) {
            return this.emit('error', new Error('Wrong value of msg head'))
        }
        if (msg.readInt16BE(2) !== 3) {
            return
        }
        let msg_len = msg.readInt16BE(4)
        let offset = 6 + msg_len
        msg_len = msg.readInt32BE(offset)
        offset += 4
        let total_msg = msg.slice(offset, offset + msg_len)
        while (total_msg.length > 0) {
            let ignore_len = 12
            total_msg = total_msg.slice(ignore_len)
            let msg_len = total_msg.readInt32BE(0)
            let msg = total_msg.slice(4, 4 + msg_len)
            total_msg = total_msg.slice(4 + msg_len)
            this._format_msg(msg)
        }
    }

    _format_msg(msg) {
        try {
            msg = JSON.parse(msg)
        } catch (e) {
            return this.emit('error', e)
        }
        let msg_obj
        switch (msg.type) {
            case '1':
                msg_obj = {
                    type: 'chat',
                    time: msg.time * 1000,
                    from: {
                        name: msg.data.from.nickName,
                        rid: msg.data.from.rid,
                        level: parseInt(msg.data.from.level),
                        plat: msg.data.from.__plat
                    },
                    content: msg.data.content,
                    raw: msg
                }
                break;
            case '205':
                msg_obj = {
                    type: 'online',
                    time: msg.time * 1000,
                    content: {
                        now: msg.data.content.show_num,
                        total: msg.data.content.total
                    },
                    raw: msg
                }
                break;
            case '208':
                msg_obj = {
                    type: 'weight',
                    time: msg.time * 1000,
                    content: parseInt(msg.data.content),
                    raw: msg
                }
                break;
            case '206':
                msg_obj = {
                    type: 'gift',
                    time: msg.time * 1000,
                    name: '竹子',
                    from: {
                        name: msg.data.from.nickName,
                        rid: msg.data.from.rid
                    },
                    count: parseInt(msg.data.content),
                    price: parseInt(msg.data.content) * 0.01,
                    raw: msg
                }
                break;
            case '306':
                msg_obj = {
                    type: 'gift',
                    time: msg.time * 1000,
                    name: msg.data.content.name,
                    from: {
                        name: msg.data.from.nickName,
                        rid: msg.data.from.rid
                    },
                    count: parseInt(msg.data.content.count),
                    price: parseInt(msg.data.content.count) * parseFloat(msg.data.content.price),
                    raw: msg
                }
                break;
            default:
                msg_obj = {
                    type: 'other',
                    time: msg.time * 1000 || new Date().getTime(),
                    raw: msg
                }
                break;
        }
        return this.emit('message', msg_obj)
    }

    _heartbeat() {
        try {
            this._client.send(Buffer.from([0x00, 0x06, 0x00, 0x00]))
        } catch (err) {
            this.emit('error', err)
        }
    }

    _stop() {
        this._starting = false
        clearInterval(this._heartbeat_timer)
        this._client && this._client.terminate()
    }

    stop() {
        this.removeAllListeners()
        this._stop()
    }
}

module.exports = panda_danmu