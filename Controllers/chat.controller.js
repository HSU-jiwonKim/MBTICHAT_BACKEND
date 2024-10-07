const Chat = require("../Models/chat");
const chatController = {};

chatController.saveChat = async (message, user) => {
    const newMessage = new Chat({
        chat: message,
        user: {
            id: user._id,
            name: user.name
        },
        timestamp: new Date() // 현재 시간을 추가
    });

    await newMessage.save(); // 메시지 저장
    return newMessage;
};

module.exports = chatController; // connectedUsers 변수를 제거하고 chatController만 내보냄
