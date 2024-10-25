import express from "express"; // ESM 방식으로 express 가져오기
import mongoose from "mongoose"; // ESM 방식으로 mongoose 가져오기
import dotenv from "dotenv"; // ESM 방식으로 dotenv 가져오기
import cors from "cors"; // ESM 방식으로 cors 가져오기

dotenv.config(); // 환경 변수 로드

const app = express();
app.use(cors()); // 모든 주소에 접근 허용

// 데이터베이스 주소만 주면 데이터베이스와 연결됨.
mongoose.connect(process.env.DB, {
    useNewUrlParser: true, // MongoDB URL parser 사용
    useUnifiedTopology: true // 새로운 토폴로지 사용
})
.then(() => console.log("connected to database"))
.catch(err => console.error("Database connection error:", err)); // 연결 실패 시 에러 출력

export default app; // ESM 방식으로 app 내보내기
