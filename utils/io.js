// 통신 관련 파일
module.exports = function(io) {
    // 소켓 io에서 제공하는 두 가지 함수 emit() 말하기 함수 on() 듣는 함수
    io.on("connection", async (socket) => { // 연결할 사람 있는지 듣기
        console.log("client is connected", socket.id);

        // 연결 오류 로그 추가
        socket.on("error", (error) => {
            console.error("Socket error:", error);
        });

        // 다른 사용자에게 메시지를 전송하는 예제 (필요한 경우)
        // socket.on("sendMessage", (message) => {
        //     io.emit("receiveMessage", message);
        // });
    });

    // 서버에 연결 실패 시 오류 처리
    io.on("error", (error) => {
        console.error("Server error:", error);
    });
};
