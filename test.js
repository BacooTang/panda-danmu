const panda_danmu = require('./index')
const roomid = '80000'
const client = new panda_danmu(roomid)

client.on('connect', () => {
    console.log(`已连接panda ${roomid}房间弹幕~`)
})

client.on('message', msg => {
    switch (msg.type) {
        case 'chat':
            console.log(`[${msg.from.name}]:${msg.content}`)
            break
        case 'gift':
            console.log(`[${msg.from.name}]->赠送${msg.count}个${msg.name}`)
            break
        case 'zhuzi':
            console.log(`[${msg.from.name}]->赠送${msg.count}个${msg.name}`)
            break
        case 'height':
            console.log(`[当前身高]:${msg.count}`)
            break
        case 'online':
            console.log(`[当前人气]:${msg.count}`)
            break
    }
})

client.on('error', e => {
    console.log(e)
})

client.on('close', () => {
    console.log('close')
})

client.start()