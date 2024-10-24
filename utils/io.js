const chatController = require("../Controllers/chat.controller.js");
const userController = require("../Controllers/user.controller.js");

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

        socket.on("login", async (userName, cb, isFakeUser = false) => {
            console.log("User name received:", userName);
            if (typeof cb !== "function") {
                console.error("Callback is not a function");
                return;
            }
            try {
                // 사용자 중복 체크 (페이크 사용자 제외)
                const existingUser = Object.values(users).find(user => user.name === userName && !user.isFake);
                if (existingUser) {
                    cb({ ok: false, error: "이미 사용 중인 닉네임입니다." });
                    return;
                }

                // 사용자 정보를 저장 (페이크 사용자인지 여부 저장)
                const user = await userController.saveUser(userName, socket.id);
                user.isFake = isFakeUser; // 페이크 사용자 플래그 설정
                users[socket.id] = user; // 소켓 ID를 키로 사용자 정보를 저장
                
                if (!isFakeUser) {
                    connectedUsers++; // 페이크 사용자가 아닐 때만 증가
                    io.emit("userCount", connectedUsers); // 사용자 수 업데이트
                }

                cb({ ok: true, data: user });

                if (!isFakeUser) { // 페이크 사용자가 아닐 때만 메시지 전송
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
                }

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
                if (!user.isFake) { // 페이크 사용자가 아니면 메시지 전송
                    const newMessage = await chatController.saveChat(message, user);
                    io.emit("message", newMessage);
                }
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
            if (users[socket.id]) {
                const user = users[socket.id];
                if (!user.isFake) {
                    connectedUsers--; // 페이크 사용자가 아니면 감소
                    const leaveMessage = {
                        chat: `${userName} 님이 나갔습니다.`,
                        user: { id: null, name: "system" },
                    };
                    io.emit("message", leaveMessage);
                    io.emit("userCount", connectedUsers);
                }
                delete users[socket.id]; // 사용자 정보 삭제
            }
            cb({ ok: true });
        });

        socket.on("disconnect", () => {
            const user = users[socket.id];
            if (user) {
                if (!user.isFake) {
                    connectedUsers--; // 페이크 사용자가 아니면 감소
                    const leaveMessage = {
                        chat: `${user.name} 님이 나갔습니다.`,
                        user: { id: null, name: "system" },
                    };
                    io.emit("message", leaveMessage);
                    io.emit("userCount", connectedUsers);
                }
                delete users[socket.id]; // 사용자 정보 삭제
            }
            console.log("client disconnected", socket.id);
        });
    });

    io.on("error", (error) => {
        console.error("Server error:", error);
    });
};
