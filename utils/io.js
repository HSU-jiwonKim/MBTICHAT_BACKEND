// 통신 관련 파일
const chatController = require("../Controllers/chat.controller.js");
const userController = require("../Controllers/user.controller.js");

module.exports = function(io) {
    // 소켓 io에서 제공하는 두 가지 함수 emit() 말하기 함수 on() 듣는 함수
    io.on("connection", async (socket) => { // 연결할 사람 있는지 듣기
        console.log("client is connected", socket.id);

        socket.on("login", async (userName, cb) => {
            console.log("User name received:", userName); // 사용자 이름 확인
            try {
                const user = await userController.saveUser(userName, socket.id);
                cb({ ok: true, data: user }); // 수정된 부분
                const welcomeMessage = { // 유저가 처음 들어왔을떄
                    chat: `${user.name} has joined the room`, // 템플릿 리터럴 수정
                    user: { id: null, name: "system" },
                };
                io.emit("message",welcomeMessage); // 모두에게 welcomeMessage 보내기
            } catch (error) {
                cb({ ok: false, error: error.message });
            }
        }); //로그인으로 말했을때 이 함수를 실행시키겠다.

        socket.on("sendMessage", async (message, cb) => {
            try {
                // 유저 찾기 socket id로
                const user = await userController.checkUser(socket.id);                
                // 메세지 저장(유저)
                const newMessage = await chatController.saveChat(message, user);
                io.emit("message", newMessage); //(서버가 다른 클라이언트에게 말하는 작업) 다른 클라이언트들에게 알려주는 작업
                cb({ ok: true });
            } catch (error) {
                cb({ ok: false, error: error.message }); // 수정된 부분
            }
        }); //sendMessage라는 말을 들었을때 실행되는 함수(메세지 내용과 콜백함수가 반환됨)

        // 연결 오류 로그 추가
        socket.on("error", (error) => {
            console.error("Socket error:", error);
        });
    });

    // 서버에 연결 실패 시 오류 처리
    io.on("error", (error) => {
        console.error("Server error:", error);
    });
};
