# panda-danmu

panda-danmu 是Node.js版本熊猫TV（非星颜板块）弹幕监听模块。

简单易用，使用不到三十行代码，你就可以使用Node.js基于弹幕进一步开发。

## Installation

可以通过本命令安装 panda-danmu:

```bash
npm install panda-danmu --save
```

## Simple uses

通过如下代码，可以初步通过Node.js对弹幕进行处理。

```javascript
const panda_danmu = require('panda-danmu')
const roomid = '666666'
const client = new panda_danmu(roomid)

client.on('connect', () => {
    console.log(`已连接panda.tv ${roomid}房间弹幕~`)
})

client.on('message', msg => {
    switch(msg.type){
        case 'chat':
            console.log(`[${msg.from.name}]:${msg.content}`)
            break
        case 'gift':
            console.log(`[${msg.from.name}]->赠送${msg.count}个${msg.name}`)
            break
        default:
            //do what you like
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
const roomid = '666666'
const client = new panda_danmu(roomid)
client.start()
```

### 停止监听弹幕

```javascript
client.stop()
```

### 监听事件

```javascript
client.on('connect', () => {
    console.log('connect')
})

client.on('message', msg => {
    console.log('message',msg)
})

client.on('error', e => {
    console.log('error',e)
})

client.on('close', () => {
    console.log('close')
})
```

### 断线重连

```javascript
client.on('close', () => {
    client.start()
})
```

### msg对象

msg对象type有chat,gift,online,weight,other五种值
分别对应聊天内容、礼物、在线人数、体重、其他

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
        content: '聊天内容,String',
        raw: '原始消息,Object'
    }
```

#### gift消息
```javascript
    {
        type: 'gift',
        time: '毫秒时间戳,Number',
        name: '礼物名称,String',
        from: {
            name: '发送者昵称,String',
            rid: '发送者rid,String'
        },
        count: '礼物数量,Number',
        price: '礼物总价值(单位猫币),Number'
        raw: '原始消息,Object'
    }
```

#### online消息
```javascript
    {
        type: 'online',
        time: '毫秒时间戳,Number',
        content: {
            now: '当前人气值,Number',
            total: '本次开播累计人气,Number'
        },
        raw: '原始消息,Object'
    }
```

#### weight消息
```javascript
    {
        type: 'weight',
        time: '毫秒时间戳,Number',
        content: '主播当前体重,Number',
        raw: '原始消息,Object'
    }
```

#### other消息
```javascript
    {
        type: 'other',
        time: '毫秒时间戳,Number',
        raw: '原始消息,Object'
    }
```