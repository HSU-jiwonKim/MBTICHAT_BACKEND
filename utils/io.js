const chatController = require("../Controllers/chat.controller.js");
const userController = require("../Controllers/user.controller.js");
const multer = require("multer");
const path = require("path");

// Multer 설정
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // 업로드할 폴더 경로
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}${ext}`); // 파일 이름 설정
    }
});

const upload = multer({ storage: storage });

module.exports = function (io) {
    let connectedUsers = 0;
    const users = {}; // 사용자 정보를 저장할 객체 추가

    io.on("connection", async (socket) => {
        connectedUsers++;
        io.emit("userCount", connectedUsers);
        console.log("client is connected", socket.id);

        socket.on("login", async (userName, cb) => {
            console.log("User name received:", userName);
            try {
                const user = await userController.saveUser(userName, socket.id);
                users[socket.id] = user; // 소켓 ID를 키로 사용자 정보를 저장
                cb({ ok: true, data: user });

                // 사용자에게 그날의 날짜 메시지 보내기
                const today = new Date();
                const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', locale: 'ko-KR' };
                const dateMessage = {
                    chat: `📅 ${today.toLocaleDateString('ko-KR', options)} >`,
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
            try {
                const user = await userController.checkUser(socket.id);
                const newMessage = await chatController.saveChat(message, user);
                io.emit("message", newMessage);
                cb({ ok: true });
            } catch (error) {
                cb({ ok: false, error: "메시지 전송 실패: " + error.message });
            }
        });

        // 사용자 프로필 이미지 업로드 핸들러
        socket.on("uploadProfileImage", async (fileData, cb) => {
            const fileBuffer = Buffer.from(fileData.split(",")[1], "base64"); // base64 디코딩
            const fileName = `${Date.now()}.png`; // 파일 이름 설정
            const filePath = `uploads/${fileName}`;

            // 파일 저장
            require("fs").writeFile(filePath, fileBuffer, async (err) => {
                if (err) {
                    return cb({ ok: false, error: "파일 저장 실패" });
                }

                const user = users[socket.id]; // 현재 사용자 정보 가져오기
                await userController.updateProfileImage(user.id, filePath); // DB에 이미지 URL 저장
                cb({ ok: true, imageUrl: filePath }); // 클라이언트에 성공 응답
            });
        });

        socket.on("userLeave", async (userName, cb) => {
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
                connectedUsers--;
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
