import dotenv from 'dotenv'; // dotenv 패키지 불러오기
dotenv.config(); // 환경 변수 로드
console.log("API Key:", process.env.OPENAI_API_KEY); // API 키가 제대로 로드되었는지 확인

import { createServer } from 'http'; // http를 통해서 서버를 생성
import app from './app.js'; // 아까 만든 앱 불러오기
import { Server } from 'socket.io'; // socket.io를 불러오기

const httpServer = createServer(app); // createServer를 통해서 서버 생성
const io = new Server(httpServer, {
    cors: { // CORS 설정
        origin: "*" // 모든 도메인 허용
    }
});

import setupIo from './utils/io.js'; // io 설정을 위한 utils 모듈 호출
setupIo(io);

httpServer.listen(5001, () => { // 포트 5001로 서버 실행
    console.log("server listening on port", 5001); // 포트 연결 확인
});
