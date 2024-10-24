const express = require("express");
const mongoose = require("mongoose"); // 데이터베이스를 연결할수 있도록 도와주는 mongoose 불러오기.
require('dotenv').config(); // dotenv 불러오기. .config() 메소드는 환경 변수를 process.env에 추가 해주는 역할을 함.
const cors = require("cors"); // cors 불러오기(이걸 설정해주지 않으면 백엔드는 동일한 도메인 주소 외에는 접근을 제한함.)
const app = express();
app.use(cors()); // 어떤 주소로든 접근 허가

// 데이터베이스 주소만 주면 데이터베이스와 연결됨.
mongoose.connect(process.env.DB)
  .then(() => console.log("connected to database"))
  .catch(err => console.error("Database connection error:", err));

// 기존 소켓 서버를 불러와야 합니다. (app.js는 express 설정만 처리)
const http = require("http");
const socketIo = require("socket.io");
const server = http.createServer(app);
const io = socketIo(server);

// 실제 서버에서 사용하는 소켓 설정을 chatSocket.js에서 관리한다고 가정
require("./sockets/chatSocket")(io);

// 5분마다 페이크 사용자 접속 시뮬레이션
setInterval(() => {
  const fakeSocketId = `fake_user_${Date.now()}`; // 고유한 소켓 ID 생성
  const fakeUserName = "페이크사용자";

  // 페이크 사용자 로그인 로직을 직접 호출
  io.emit("login", fakeUserName, (response) => {
    console.log("Fake user login response:", response);
  }, true); // true는 페이크 사용자 플래그
}, 5 * 60 * 1000); // 5분마다 실행

// 서버가 요청을 수신할 포트 설정
server.listen(3000, () => {
  console.log("Server running on port 3000");
});

// 앱 모듈을 내보내기
module.exports = app;
