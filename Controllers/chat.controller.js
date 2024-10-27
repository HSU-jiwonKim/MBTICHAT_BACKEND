import Chat from '../Models/chat.js';

const chatController = {};

chatController.saveChat = async (message, user) => {
    const newMessage = new Chat({
        chat: message,
        user: {
            id: user._id,
            name: user.nickname, // user.name 대신 user.nickname 사용
        },
        timestamp: new Date(), 
    });

    await newMessage.save(); 
    return newMessage;
};

export default chatController;