const express = require("express");
const mongoose = require("mongoose");
const { Configuration, OpenAIApi } = require("openai"); // 'require'로 수정
require('dotenv').config();
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json()); // JSON 요청을 처리하기 위해 추가

// OpenAI API 설정
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// 데이터 베이스 연결
mongoose.connect(process.env.DB, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
}).then(() => console.log("connected to database")).catch(err => console.error("Database connection error:", err));

// GPT API와 상호작용하는 엔드포인트 추가
app.post("/api/chat", async (req, res) => {
    const { message } = req.body; // 클라이언트에서 보낸 메시지

    try {
        const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo", // 사용할 모델
            messages: [{ role: "user", content: message }],
        });
        
        const reply = response.data.choices[0].message.content; // GPT의 응답
        res.json({ reply }); // 클라이언트에 응답 전송
    } catch (error) {
        console.error("Error with OpenAI API:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = app;
