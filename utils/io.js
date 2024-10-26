socket.on('sendMessage', async (message, cb) => {
  console.log('Message to send:', message);
  if (typeof cb !== 'function') {
    console.error('Callback is not a function');
    return;
  }

  try {
    const user = await userController.checkUser(socket.id);
    const now = Date.now();

    // !부기 명령어 확인
    if (message.startsWith('!부기')) {
      if (now - lastGPTCallTime < GPT_COOLDOWN) {
        cb({ ok: false, error: '너무 많은 요청입니다. 몇 초 후에 다시 시도해주세요.' });
        return;
      }
      lastGPTCallTime = now;

      const prompt = message.replace('!부기', '').trim();

      // 사용자 메시지를 채팅방에 남기기
      const userMessage = {
        chat: `${user.name}: ${message}`,
        user: { id: user.id, name: user.name },
      };
      io.emit('message', userMessage);

      try {
        // Gemini API 호출
        const generativeModel = vertexAI.getGenerativeModel({
          model: 'gemini-1.5-flash-001',
        });

        const request = {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        };

        // generateContent 메서드 사용
        const response = await generativeModel.generateContent(request);
        console.log('Gemini API 응답:', response); // 응답 로깅

        // candidates 배열이 비어 있지 않은지 확인
        if (response?.response?.candidates && response.response.candidates.length > 0) {
          const fullTextResponse = response.response.candidates[0].content.parts[0].text;

          const botMessage = {
            chat: `부기: ${fullTextResponse}`,
            user: { id: null, name: '부기' },
          };
          io.emit('message', botMessage);
          cb({ ok: true });
        } else {
          cb({ ok: false, error: 'Gemini API 응답이 유효하지 않습니다.' });
        }

      } catch (error) {
        console.error('Gemini API 호출 오류:', error);
        cb({ ok: false, error: 'Gemini API 호출 오류: ' + error.message });
      }
      return;
    }

    // 일반 메시지 처리
    const newMessage = await chatController.saveChat(message, user);
    io.emit('message', newMessage);
    cb({ ok: true });
  } catch (error) {
    console.error('메시지 전송 중 오류 발생:', error);
    cb({ ok: false, error: '메시지 전송 실패: ' + error.message });
  }
});
