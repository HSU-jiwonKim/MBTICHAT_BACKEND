require("dotenv").config(); // dotenv 패키지를 통해 환경 변수 로드
console.log("API Key:", process.env.OPENAI_API_KEY);  // API 키가 제대로 로드되었는지 확인

const { createServer } = require("http"); // http를 통해서 서버를 생성
const app = require("./app"); // 아까 만든 앱 불러오기
const { Server } = require("socket.io"); // socket.io를 불러오기

const httpServer = createServer(app); // createServer를 통해서 서버 생성
const io = new Server(httpServer, {
    cors: { // CORS 설정
        origin: "*" // 모든 도메인 허용
    }
});

require("./utils/io")(io); // io 설정을 위한 utils 모듈 호출

httpServer.listen(5001, () => { // 포트 5001로 서버 실행
    console.log("server listening on port", 5001); // 포트 연결 확인
});
