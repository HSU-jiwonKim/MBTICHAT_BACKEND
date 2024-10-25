import mongoose from 'mongoose'; // ESM 방식으로 mongoose 가져오기

const chatSchema = new mongoose.Schema({
    chat: {
        type: String,
        required: true
    },
    user: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        name: {
            type: String,
            required: true
        }
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// 기본 내보내기로 Chat 모델 생성 및 내보내기
const Chat = mongoose.model('Chat', chatSchema);
export default Chat; // 기본 내보내기
