// 환경 변수 설정을 위해 dotenv 패키지를 불러옵니다.
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
            console.log("User name received:", userName);
            if (typeof cb !== "function") {
                console.error("Callback is not a function");
                return;
            }
            try {
                // 사용자 중복 체크
                const existingUser = Object.values(users).find(user => user.name === userName);
                if (existingUser) {
                    cb({ ok: false, error: "이미 사용 중인 닉네임입니다." });
                    return;
                }

                // 사용자 정보를 저장
                const user = await userController.saveUser(userName, socket.id);
                users[socket.id] = user; // 소켓 ID를 키로 사용자 정보를 저장
                connectedUsers++; // 새로운 사용자가 연결되었으므로 증가
                io.emit("userCount", connectedUsers); // 사용자 수 업데이트

                cb({ ok: true, data: user });

                // 한국 시간 기준으로 날짜 메시지 전송
                const today = new Date();
                const options = { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric', 
                    weekday: 'long', 
                    timeZone: 'Asia/Seoul'  // 한국 시간대 설정
                };
                const dateMessage = {
                    chat: `📅${new Intl.DateTimeFormat('ko-KR', options).format(today)} >`,
                    user: { id: null, name: "system" },
                };
                socket.emit("message", dateMessage); // 해당 사용자에게만 메시지 전송

                const welcomeMessage = {
                    chat: `${user.name} 님이 들어왔습니다.`,
                    user: { id: null, name: "system" },
                };
                io.emit("message", welcomeMessage);
            } catch (error) {
                cb({ ok: false, error: error.message });
            }
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
                    
                    const gptResponse = await openaiClient.createChatCompletion({
                        model: "gpt-3.5-turbo",
                        messages: [
                            { role: "system", content: "You are a helpful assistant." },
                            { role: "user", content: prompt },
                        ],
                    });

                    const gptMessage = gptResponse.data.choices[0].message.content;
                    const botMessage = {
                        chat: `GPT: ${gptMessage}`,
                        user: { id: null, name: "GPT" },
                    };

                    io.emit("message", botMessage);  // GPT 응답 전송
                    cb({ ok: true });
                    return;
                }

                // 일반 메시지 처리
                const newMessage = await chatController.saveChat(message, user);
                io.emit("message", newMessage);
                cb({ ok: true });
            } catch (error) {
                cb({ ok: false, error: "메시지 전송 실패: " + error.message });
            }
        });

        socket.on("userLeave", async (userName, cb) => {
            console.log("User leaving:", userName);
            if (typeof cb !== "function") {
                console.error("Callback is not a function");
                return;
            }
            if (users[socket.id]) { // 사용자 정보가 있을 경우에만 감소
                connectedUsers--;
                const leaveMessage = {
                    chat: `${userName} 님이 나갔습니다.`,
                    user: { id: null, name: "system" },
                };
                io.emit("message", leaveMessage);
                io.emit("userCount", connectedUsers);
                delete users[socket.id]; // 사용자 정보 삭제
            }
            cb({ ok: true });
        });

        socket.on("disconnect", () => {
            const user = users[socket.id]; // 연결이 끊어진 사용자를 찾음
            if (user) {
                connectedUsers--; // 연결된 사용자 수 감소
                const leaveMessage = {
                    chat: `${user.name} 님이 나갔습니다.`,
                    user: { id: null, name: "system" },
                };
                io.emit("message", leaveMessage);
                io.emit("userCount", connectedUsers);
                delete users[socket.id]; // 사용자 정보 삭제
            }
            console.log("client disconnected", socket.id);
        });
    });

    io.on("error", (error) => {
        console.error("Server error:", error);
    });
};
