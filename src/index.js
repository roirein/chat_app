const express = require('express')
const http = require('http')
const path = require('path')
const socketio = require('socket.io')
const Filter = require('bad-words')
const {generateMessage, generateLocationMessage} = require('./utils/messages')
const {addUser,removeUser,getUser,getUsersInRoom} = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const pubDirectory = path.join(__dirname,'../public')

app.use(express.static(pubDirectory))

io.on('connection',(socket) =>{

    socket.on('join', (options, callback) => {

        const {error,user} = addUser({id: socket.id, ...options})

        if(error){
            return callback(error)
        }
        socket.join(user.room)
        socket.emit('message',generateMessage('Server','Welcome'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Server',`${user.username} has joined the chat`))
        io.to(user.room).emit('roomData',{
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()

    })

    socket.on('sendMessage', (message, callback )=>{
        const user = getUser(socket.id)
        const room = user.room
        const filter = new Filter()

        if (filter.isProfane(message)){
            return callback('Profanity is not allowed')
        }
        io.to(room).emit('message',generateMessage(user.username,message))
        callback()
    })
    socket.on('disconnect', () =>{
        const user = removeUser(socket.id)
        if(user){
            io.to(user.room).emit('message', generateMessage('Server',`${user.username} has left`))
            io.to(user.room).emit('roomData',{
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

    socket.on('sendLocation', (location, callback)=>{
        const user = getUser(socket.id)
        const room = user.room
        io.to(room).emit('locationMessage',generateLocationMessage(user.username,`https://google.com/maps?q=${location.latitude},${location.longitude}`))
        callback()
    })
})

server.listen(port, ()=>{
    console.log(`Server listen on port ${port}` )
})