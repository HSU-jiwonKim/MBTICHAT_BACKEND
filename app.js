const express = require("express");
const mongoose = require("mongoose"); // 데이터베이스를 연결할수 있도록 도와주는 mongoose 불러오기.
require('dotenv').config(); // dotenv 불러오기. .config() 메소드는 환경 변수를 process.env에 추가 해주는 역할을 함.
const cors = require("cors"); // cors 불러오기(이걸 설정해주지 않으면 백엔드는 동일한 도메인 주소 외에는 접근을 제한함.)
const io = require("socket.io-client"); // socket.io 클라이언트 모듈 불러오기

const app = express();
app.use(cors()); // 어떤 주소로든 접근 허가

// 데이터 베이스 주소만 주면 데이터 베이스와 연결됨.
mongoose.connect(process.env.DB)
  .then(() => console.log("connected to database"))
  .catch(err => console.error("Database connection error:", err)); // 만약에 연결이 됬다면 log가 뜸.

// 5분마다 페이크 사용자 접속 시뮬레이션
setInterval(() => {
  const fakeSocket = io("http://localhost:3000"); // 서버 주소에 맞춰 소켓 연결
  fakeSocket.emit("login", "페이크사용자", (response) => {
    console.log("Fake user login response:", response);
  }, true); // true는 페이크 사용자임을 나타냄
}, 5 * 60 * 1000); // 5분마다 실행

// 앱 모듈을 내보내기
module.exports = app;