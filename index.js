const ws = require('ws')
const md5 = require('md5')
const events = require('events')
const request = require('request-promise')
const socks_agent = require('socks-proxy-agent')

const timeout = 30000
const heartbeat_interval = 30000
const origin = 'https://www.panda.tv'
const r = request.defaults({ json: true, gzip: true, timeout: timeout })

class panda_danmu extends events {

    constructor(opt) {
        super()
        if (typeof opt === 'string')
            this._roomid = opt
        else if (typeof opt === 'object') {
            this._roomid = opt.roomid
            this.set_proxy(opt.proxy)
        }
    }

    set_proxy(proxy) {
        this._agent = new socks_agent(proxy)
    }

    async _get_chat_info() {
        try {
            const body = await r({
                url: `https://riven.panda.tv/chatroom/getinfo?roomid=${this._roomid}&app=1&protocol=ws&_caller=panda-pc_web&_=${new Date().getTime()}`,
                agent: this._agent
            })
            if (!body || body.errno || !body.data) return null
            body.data.chat_addr = body.data.chat_addr_list[0]
            delete body.data.chat_addr_list
            return body.data
        } catch (e) {
            this.emit('error', new Error('Fail to get chat info'))
        }
    }

    async start() {
        if (this._starting) return
        this._starting = true
        this._chat_info = await this._get_chat_info()
        if (!this._chat_info) return this.emit('close')
        this._start_ws()
    }

    _start_ws() {
        this._client = new ws(`wss://${this._chat_info.chat_addr}`, {
            origin,
            perMessageDeflate: false,
            agent: this._agent
        })
        this._client.on('open', () => {
            this._ws_bind_user()
            this._heartbeat_timer = setInterval(this._heartbeat.bind(this), heartbeat_interval)
            this.emit('connect')
        })
        this._client.on('error', err => {
            this.emit('error', err)
        })
        this._client.on('close', async () => {
            this._stop()
            this.emit('close')
        })
        this._client.on('message', this._on_msg.bind(this))
    }

    _ws_bind_user() {
        const msg = `u:${this._chat_info.rid}@${this._chat_info.appid}\nts:${this._chat_info.ts}\nsign:${this._chat_info.sign}\nauthtype:${this._chat_info.authType}\nplat:jssdk_pc_web\nversion:0.5.9`
        const buf = Buffer.concat([Buffer.from([0x00, 0x06, 0x00, 0x02, 0x00, msg.length]), Buffer.from(msg)])
        try {
            this._client.send(buf)
        } catch (err) {
            this.emit('error', err)
        }
    }

    _heartbeat() {
        try {
            this._client.send(Buffer.from([0x00, 0x06, 0x00, 0x00]))
        } catch (err) {
            this.emit('error', err)
        }
    }

    _on_msg(msg) {
        try {
            if (msg.readInt16BE(0) !== 6) return
            if (msg.readInt16BE(2) !== 3) return
            let msg_len = msg.readInt16BE(4)
            let offset = 6 + msg_len
            msg_len = msg.readInt32BE(offset)
            offset += 4
            let total_msg = msg.slice(offset, offset + msg_len)
            while (total_msg.length > 0) {
                total_msg = total_msg.slice(12)
                const msg_len = total_msg.readInt32BE(0)
                const msg = total_msg.slice(4, 4 + msg_len)
                total_msg = total_msg.slice(4 + msg_len)
                this._format_msg(msg)
            }
        } catch (e) {
            this.emit('error', e)
        }
    }

    _build_chat(msg) {
        return {
            type: 'chat',
            time: msg.time * 1000,
            from: {
                name: msg.data.from.nickName,
                rid: msg.data.from.rid,
                level: parseInt(msg.data.from.level),
                plat: msg.data.from.__plat
            },
            id: md5(`${msg.data.from.rid}${msg.data.to.toroom}${msg.time}${msg.data.content}${msg.data.from.level}${msg.data.from.msgcolor}`),
            content: msg.data.content
        }
    }

    _build_online(msg) {
        return {
            type: 'online',
            time: msg.time * 1000,
            count: msg.data.content.show_num
        }
    }

    _build_height(msg) {
        return {
            type: 'height',
            time: msg.time * 1000,
            count: parseInt(msg.data.content)
        }
    }

    _build_zhuzi(msg) {
        return {
            type: 'zhuzi',
            time: msg.time * 1000,
            name: '竹子',
            from: {
                name: msg.data.from.nickName,
                rid: msg.data.from.rid
            },
            count: parseInt(msg.data.content)
        }
    }

    _build_gift(msg) {
        return {
            type: 'gift',
            time: msg.time * 1000,
            name: msg.data.content.name,
            id: md5(`${msg.time}${msg.data.to.toroom}${msg.data.from.rid}${msg.data.content.combo}${msg.data.content.name}${msg.data.content.newBamboos}${msg.data.content.newExp}`),
            from: {
                name: msg.data.from.nickName,
                rid: msg.data.from.rid
            },
            count: parseInt(msg.data.content.count),
            price: parseInt(msg.data.content.count) * parseFloat(msg.data.content.price),
            earn: parseInt(msg.data.content.count) * parseFloat(msg.data.content.price) * 0.1
        }
    }

    _format_msg(msg) {
        try {
            msg = JSON.parse(msg)
        } catch (e) { return }
        let msg_obj
        switch (msg.type) {
            case '1':
                msg_obj = this._build_chat(msg)
                this.emit('message', msg_obj)
                break
            case '205':
                msg_obj = this._build_online(msg)
                this.emit('message', msg_obj)
                break
            case '208':
                msg_obj = this._build_height(msg)
                this.emit('message', msg_obj)
                break
            case '206':
                msg_obj = this._build_zhuzi(msg)
                this.emit('message', msg_obj)
                break
            case '306':
                msg_obj = this._build_gift(msg)
                this.emit('message', msg_obj)
                break
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