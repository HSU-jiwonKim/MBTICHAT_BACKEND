module.exports = function(io) {
    let connectedUsers = 0;
    const users = {}; // 사용자 정보를 저장할 객체

    io.on("connection", async (socket) => {
        // 이미 연결된 사용자가 있는 경우 처리
        if (users[socket.id]) {
            console.log("기존 사용자 재연결:", socket.id);
            return; // 기존 사용자일 경우 새로운 연결을 만들지 않음
        }

        // 새로운 사용자가 연결되면 사용자 수 증가
        connectedUsers++;
        io.emit("userCount", connectedUsers);
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
                
                const user = await userController.saveUser(userName, socket.id);
                users[socket.id] = user; // 소켓 ID를 키로 사용자 정보를 저장
                cb({ ok: true, data: user });
                
                // 사용자에게 그날의 날짜 메시지 보내기
                const today = new Date();
                const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', locale: 'ko-KR' };
                const dateMessage = {
                    chat: `📅${today.toLocaleDateString('ko-KR', options)} >`,
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
            connectedUsers--;
            const leaveMessage = {
                chat: `${userName} 님이 나갔습니다.`,
                user: { id: null, name: "system" },
            };
            io.emit("message", leaveMessage);
            io.emit("userCount", connectedUsers);
            cb({ ok: true });
        });

        socket.on("disconnect", () => {
            const user = users[socket.id]; // 연결이 끊어진 사용자를 찾음
            if (user) {
                connectedUsers--; // 연결이 끊어질 때 사용자 수 감소
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

    // 매일 00시 00분에 날짜 메시지 보내기
    setInterval(() => {
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() === 0) {
            const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', locale: 'ko-KR' };
            const dateMessage = {
                chat: `${now.toLocaleDateString('ko-KR', options)}입니다.`,
                user: { id: null, name: "system" },
            };
            // 연결된 모든 소켓에게 발송
            io.sockets.emit("message", dateMessage);
        }
    }, 60000); // 1분마다 체크

    io.on("error", (error) => {
        console.error("Server error:", error);
    });
};
