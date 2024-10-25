require('dotenv').config();
const { Configuration, OpenAIApi } = require('openai');

const chatController = require("../Controllers/chat.controller.js");
const userController = require("../Controllers/user.controller.js");

// OpenAI API 초기화
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openaiClient = new OpenAIApi(configuration);

module.exports = function(io) {
    let connectedUsers = 0;
    const users = {}; // 사용자 정보를 저장할 객체

    io.on("connection", async (socket) => {
        // 소켓 ID로 기존 사용자 확인
        if (users[socket.id]) {
            console.log("기존 사용자 재연결:", socket.id);
            return; // 기존 사용자일 경우 새로운 연결을 만들지 않음
        }

        console.log("client is connected", socket.id);

        socket.on("login", async (userName, cb) => {
            // 로그인 처리 코드...
        });

        socket.on("sendMessage", async (message, cb) => {
            console.log("Message to send:", message);
            if (typeof cb !== "function") {
                console.error("Callback is not a function");
                return;
            }
            try {
                const user = await userController.checkUser(socket.id);

                // GPT와 상호작용하는 부분
                if (message.startsWith("!GPT")) {
                    const prompt = message.replace("!GPT", "").trim();
                    
                    const stream = await openaiClient.createChatCompletion({
                        model: "gpt-4o-mini",
                        headers: {
                            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                            'OpenAI-Organization': 'org-Uo8wlzw5XHbaQs8flpbLYk1K',
                            'OpenAI-Project': '$PROJECT_ID'
                        },
                        messages: [
                            { role: "system", content: "You are a helpful assistant." },
                            { role: "user", content: prompt },
                        ],
                        stream: true,
                    });

                    // 스트림을 통해 메시지 처리
                    for await (const chunk of stream) {
                        if (chunk.choices[0]?.delta?.content) {
                            const gptMessage = chunk.choices[0].delta.content;
                            const botMessage = {
                                chat: `GPT: ${gptMessage}`,
                                user: { id: null, name: "GPT" },
                            };
                            io.emit("message", botMessage);  // GPT 응답 전송
                        }
                    }
                    cb({ ok: true });
                    return;
                }

                // 일반 메시지 처리
                const newMessage = await chatController.saveChat(message, user);
                io.emit("message", newMessage);
                cb({ ok: true });
            } catch (error) {
                console.error("API 호출 중 에러 발생:", error);
                cb({ ok: false, error: "메시지 전송 실패: " + error.response?.data?.error?.message || error.message });
            }
        });

        socket.on("userLeave", async (userName, cb) => {
            // 사용자 퇴장 처리 코드...
        });

        socket.on("disconnect", () => {
            // 소켓 연결 해제 처리 코드...
        });
    });

    io.on("error", (error) => {
        console.error("Server error:", error);
    });
};
