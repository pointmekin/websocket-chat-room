const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const formatMessage = require('./utils/messages')
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const botName = 'ChatCord Bot'

// Set static folder
app.use(express.static(path.join(__dirname, 'public')))

// Run when the client connects
io.on('connection', (socket) => {
  // Client join room
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room)
    socket.join(user.room)

    // Broadcast to a single client
    socket.emit('message', formatMessage(botName, 'Welcome to ChatCord'))

    // Broadcast when a user connects (all other clients except the client connecting)
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined that chat`)
      )

    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room),
    })
  })

  // Listen for chatMessage
  socket.on('chatMessage', (msg) => {
    console.log('socket id', socket.id)
    const user = getCurrentUser(socket.id)
    io.to(user.room).emit('message', formatMessage(user.username, msg))
  })

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id)
    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`)
      )

      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      })
    }
  })
})

const PORT = 3000 || process.env.PORT

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
