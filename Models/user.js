// 사용자 스키마 파일

// Mongoose 라이브러리 가져오기
const mongoose = require("mongoose");

// 사용자 스키마 정의하기
const userSchema = new mongoose.Schema({
    name: { // 유저의 이름을 저장하는 필드
        type: String, // 데이터 타입: 문자열
        required: [true, "User must type name"], // 필수 입력 사항이며, 오류 메시지 설정
        unique: true, // 유일한 값이어야 함
    },
    token: { // 유저의 연결 정보(id)를 저장하는 필드
        type: String, // 데이터 타입: 문자열
    },
    online: { // 유저의 온라인 상태를 나타내는 필드
        type: Boolean, // 데이터 타입: 불리언
        default: false, // 기본값: false (오프라인)
    },
});

// Mongoose 모델 생성 및 내보내기
module.exports = mongoose.model("User", userSchema);
