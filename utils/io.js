// 통신 관련 파일
const chatController = require("../Controllers/chat.controller.js");
const userController = require("../Controllers/user.controller.js");

module.exports = function(io) {
    let connectedUsers = 0; // 현재 연결된 사용자 수

    io.on("connection", async (socket) => {
        connectedUsers++; // 사용자가 연결될 때 사용자 수 증가
        io.emit("userCount", connectedUsers); // 현재 사용자 수를 모든 클라이언트에 전송
        console.log("client is connected", socket.id);

        socket.on("login", async (userName, cb) => {
            console.log("User name received:", userName);
            try {
                const user = await userController.saveUser(userName, socket.id);
                cb({ ok: true, data: user });
                const welcomeMessage = {
                    chat: `${user.name} 님이 들어왔습니다.`,
                    user: { id: null, name: "system" },
                };
                io.emit("message", welcomeMessage); // 모든 클라이언트에 메시지 전송
            } catch (error) {
                cb({ ok: false, error: error.message });
            }
        });

        socket.on("sendMessage", async (message, cb) => {
            try {
                const user = await userController.checkUser(socket.id);
                const newMessage = await chatController.saveChat(message, user);
                io.emit("message", newMessage); // 모든 클라이언트에 새 메시지 전송
                cb({ ok: true });
            } catch (error) {
                cb({ ok: false, error: error.message });
            }
        });

        socket.on("disconnect", () => {
            connectedUsers--; // 사용자가 연결 해제될 때 사용자 수 감소
            io.emit("userCount", connectedUsers); // 현재 사용자 수를 모든 클라이언트에 전송
            console.log("client disconnected", socket.id);
        });

        socket.on("error", (error) => {
            console.error("Socket error:", error);
        });
    });

    io.on("error", (error) => {
        console.error("Server error:", error);
    });
};
