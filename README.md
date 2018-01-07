# panda-danmu

panda-danmu 是Node.js版本熊猫TV（非星颜板块）弹幕监听模块。

简单易用，使用三十行代码，你就可以使用Node.js基于弹幕进一步开发。

## Installation

可以通过本命令安装 panda-danmu:

```bash
npm install panda-danmu --save
```

## Simple uses

通过如下代码，可以初步通过Node.js对弹幕进行处理。

```javascript
const panda_danmu = require('panda-danmu')
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
```

## API

### 开始监听弹幕

```javascript
const panda_danmu = require('panda-danmu')
const roomid = '80000'
const client = new panda_danmu(roomid)
client.start()
```

### 使用socks5代理监听

```javascript
const panda_danmu = require('panda-danmu')
const roomid = '80000'
const proxy = 'socks://name:pass@127.0.0.1:1080'
const client = new panda_danmu({roomid,proxy})
client.start()
```

### 停止监听弹幕

```javascript
client.stop()
```

### 断线重连

```javascript
client.on('close', _ => {
    client.start()
})
```

### 监听事件

```javascript
client.on('connect', _ => {
    console.log('connect')
})

client.on('message', console.log)

client.on('error', console.log)

client.on('close', _ => {
    console.log('close')
})
```

### msg对象

msg对象type有chat,gift,zhuzi,height,online
分别对应聊天内容、礼物、竹子、身高、在线人数

#### chat消息
```javascript
    {
        type: 'chat',
        time: '毫秒时间戳,Number',
        from: {
            name: '发送者昵称,String',
            rid: '发送者rid,String',
            level: '发送者等级,Number',
            plat: '发送者平台(android,ios,pc_web),String'
        },
        id: '弹幕唯一id,String',
        content: '聊天内容,String'
    }
```

#### gift消息
```javascript
    {
        type: 'gift',
        time: '毫秒时间戳,Number',
        name: '礼物名称,String',
        id: '礼物唯一id,String',
        from: {
            name: '发送者昵称,String',
            rid: '发送者rid,String'
        },
        count: '礼物数量,Number',
        price: '礼物总价值(单位猫币),Number',
        earn: '礼物总价值(单位元),Number'
    }
```

#### zhuzi消息
```javascript
    {
        type: 'zhuzi',
        time: '毫秒时间戳,Number',
        name: '礼物名称,String',
        from: {
            name: '发送者昵称,String',
            rid: '发送者rid,String'
        },
        count: '礼物数量,Number'
    }
```

#### online消息
```javascript
    {
        type: 'online',
        time: '毫秒时间戳,Number',
        count: '当前人气值,Number'
    }
```

#### height消息
```javascript
    {
        type: 'height',
        time: '毫秒时间戳,Number',
        count: '主播当前身高,Number'
    }
```