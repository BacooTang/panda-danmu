const { test } = require('ava')
const request = require('request-promise')
const panda_danmu = require('./index')

let roomids = []
let wrong_roomid = ''
let most_online_roomid

test.before(async () => {
    let opt = {
        url: `https://www.panda.tv/ajax_sort?pageno=1&pagenum=120&classification=jingji&_=${new Date().getTime()}`,
        timeout: 10000,
        json: true
    }
    let body = await request(opt)
    let max_online = 0
    body.data.items.forEach(item => {
        roomids.push(item.id)
        if (parseInt(item.person_num) > max_online) {
            most_online_roomid = item.id
            max_online = parseInt(item.person_num)
        }
    })
})

test('expose a constructor', t => {
    t.is(typeof panda_danmu, 'function')
})

test('instance class', t => {
    const client = new panda_danmu(roomids[0])
    t.is(client._roomid, roomids[0]);
})

test('get chat info', async t => {
    const client = new panda_danmu(roomids[0])
    let chat_info = await client._get_chat_info()
    t.truthy(chat_info)
    t.is(typeof chat_info.appid, 'string')
    t.is(typeof chat_info.rid, 'number')
    t.is(typeof chat_info.sign, 'string')
    t.is(typeof chat_info.authType, 'string')
    t.is(typeof chat_info.ts, 'number')
    t.is(typeof chat_info.chat_addr, 'string')
})

test('get a error room info', async t => {
    const client = new panda_danmu(wrong_roomid)
    let chat_info = await client._get_chat_info()
    t.falsy(chat_info)
})

test.cb('start success', t => {
    const client = new panda_danmu(roomids[0])
    client.start()
    client.on('connect', () => {
        t.is(typeof client._client, 'object')
        client.stop()
        t.end()
    })
})

test('start fail 1', t => {
    const client = new panda_danmu(roomids[0])
    client._starting = true
    client.start()
    t.falsy(client._client)
})

test.cb('start fail 2', t => {
    const client = new panda_danmu(wrong_roomid)
    client.start()
    client.on('error', err => {
        t.is(err.message, 'Fail to get chat info')
        client.stop()
        t.end()
    })
})

test.cb('heart beat', t => {
    const client = new panda_danmu(roomids[1])
    client.start()
    client.on('connect', () => {
        client._heartbeat()
        setTimeout(() => {
            t.true(client._starting)
            client.stop()
            t.end()
        }, 1000);
    })
})

test.cb('fail heart beat', t => {
    const client = new panda_danmu(roomids[1])
    client.start()
    client.on('connect', () => {
        client._client.terminate()
        t.throws(() => {
            client._heartbeat()
        })
        client.stop()
        t.end()
    })
})

test('on mes error', t => {
    const client = new panda_danmu(roomids[4])
    t.throws(() => {
        client._on_msg('123')
    })
})

test('on mes error 2', t => {
    const client = new panda_danmu(roomids[3])
    t.throws(() => {
        client._on_msg(Buffer.from([0x00, 0x04]))
    })
})

test.cb('fail bind ws user', t => {
    const client = new panda_danmu(roomids[2])
    client.start()
    client.on('connect', () => {
        client._stop()
        client._ws_bind_user()
    })
    client.on('error', err => {
        t.is(err.message, 'not opened')
        client.stop()
        t.end()
    })
})

test.cb('fail format msg', t => {
    const client = new panda_danmu(roomids[5])
    client.start()
    client.on('connect', () => {
        client._format_msg()
    })
    client.on('error', err => {
        t.is(err.message, 'Unexpected token u in JSON at position 0')
        client.stop()
        t.end()
    })
})

test.cb('get chat msg', t => {
    const client = new panda_danmu(most_online_roomid)
    client.start()
    client.on('message', msg => {
        if (msg.type === 'chat') {
            t.is(typeof msg.time, 'number')
            t.is(typeof msg.from.name, 'string')
            t.is(typeof msg.from.rid, 'string')
            t.is(typeof msg.from.level, 'number')
            t.is(typeof msg.from.plat, 'string')
            t.is(typeof msg.content, 'string')
            client.stop()
            t.end()
        }
    })
})

test.cb('get online msg', t => {
    const client = new panda_danmu(most_online_roomid)
    client.start()
    client.on('message', msg => {
        if (msg.type === 'online') {
            t.is(typeof msg.time, 'number')
            t.is(typeof msg.content.now, 'number')
            t.is(typeof msg.content.total, 'number')
            client.stop()
            t.end()
        }
    })
})

test.cb('get gift msg', t => {
    const client = new panda_danmu(most_online_roomid)
    client.start()
    client.on('message', msg => {
        if (msg.type === 'gift') {
            t.is(typeof msg.time, 'number')
            t.is(typeof msg.name, 'string')
            t.is(typeof msg.from.name, 'string')
            t.is(typeof msg.from.rid, 'string')
            t.is(typeof msg.count, 'number')
            t.is(typeof msg.price, 'number')
            client.stop()
            t.end()
        }
    })
})

// const panda_danmu = require('./index')


// for (let i = 0; i < 2; i++) {
//     const client = new panda_danmu('763137')
//     client.on('message', msg => {
//         if (msg.type === 'gift' && msg.name === '竹子') {
//             console.log(JSON.stringify(msg));
//         } else if (msg.type === 'height') {
//             console.log(JSON.stringify(msg));
//         }
//     })

//     client.on('error', err => {
//         console.log(err);
//     })

//     client.start()
// }

