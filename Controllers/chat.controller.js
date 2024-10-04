// 메시지를 저장하는 함수파일
const Chat = require("../Models/chat");
const chatController = {}
   
    chatController.saveChat = async(message,user)=>{ //message는 io.js socket.on에서 가져올수있고 유저정보는 socket으로 알수있음. 유저 정보에 토큰값으로 socket.id값을 같이 저장해 놓는데 그렇기 댸문에 socket.id로 유저를 찾을수 있음.
        const newMessage = new Chat({ // Chat은 모델
            chat:message,
            user:{
                id:user._id,
                name:user.name
            }
        })
        await newMessage.save(); // 메시지 저장
        return newMessage;
    }
    module.exports=chatController;