const Chat = require("../Models/chat"); // require로 Chat 모델 가져오기

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

module.exports = chatController; // chatController 내보내기
