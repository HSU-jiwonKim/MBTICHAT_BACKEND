// 채팅 스키마 파일

// Mongoose 라이브러리 가져오기
const mongoose = require("mongoose");

// 채팅 스키마 정의하기
const chatSchema = new mongoose.Schema({
    chat: String, // 메세지 내용을 저장하는 필드
    user: { // 유저 정보를 저장하는 필드
        id: { // 유저 ID 정보를 저장하는 필드
            type: mongoose.Schema.ObjectId, // 데이터 타입: MongoDB ObjectId
            ref: "User", // User 모델과의 참조 관계 설정
        },
        name: String, // 유저 이름을 저장하는 필드
    },
}, 
{ timestamps: true } // 생성 및 수정 시간 자동 추가
);

// Mongoose 모델 생성 및 내보내기
module.exports = mongoose.model("Chat", chatSchema);
