import { Server } from 'socket.io'; // socket.io를 불러옵니다.
import googleGenerativeAI from 'google.generativeai'; // google.generativeai를 불러옵니다.
import dotenv from 'dotenv'; // dotenv 패키지를 불러옵니다.
import chatController from '../Controllers/chat.controller.js'; // require 대신 import 사용
import userController from '../Controllers/user.controller.js'; // require 대신 import 사용

dotenv.config(); // 환경 변수 로드

// Gemini API 초기화
googleGenerativeAI.configure({
  apiKey: process.env.GOOGLE_API_KEY, // 환경 변수에서 Gemini API 키를 로드합니다.
});

// API 호출 쿨다운 설정
let lastGPTCallTime = 0; 
const GPT_COOLDOWN = 5000; // 5초 쿨다운

export default function (io) {
  let connectedUsers = 0;
  const users = {}; // 사용자 정보를 저장할 객체

  io.on('connection', async (socket) => {
    if (users[socket.id]) {
      console.log('기존 사용자 재연결:', socket.id);
      return; // 기존 사용자일 경우 새로운 연결을 만들지 않음
    }

    console.log('client is connected', socket.id);

    socket.on('login', async (userName, cb) => {
      console.log('User name received:', userName);
      if (typeof cb !== 'function') {
        console.error('Callback is not a function');
        return;
      }
      try {
        const existingUser = Object.values(users).find(user => user.name === userName);
        if (existingUser) {
          cb({ ok: false, error: '이미 사용 중인 닉네임입니다.' });
          return;
        }

        const user = await userController.saveUser(userName, socket.id);
        users[socket.id] = user; // 소켓 ID를 키로 사용자 정보를 저장
        connectedUsers++; // 새로운 사용자가 연결되었으므로 증가
        io.emit('userCount', connectedUsers); // 사용자 수 업데이트

        cb({ ok: true, data: user });

        const today = new Date();
        const options = {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
          timeZone: 'Asia/Seoul',
        };
        const dateMessage = {
          chat: `📅${new Intl.DateTimeFormat('ko-KR', options).format(today)} >`,
          user: { id: null, name: 'system' },
        };
        socket.emit('message', dateMessage);

        const welcomeMessage = {
          chat: `${user.name} 님이 들어왔습니다.`,
          user: { id: null, name: 'system' },
        };
        io.emit('message', welcomeMessage);
      } catch (error) {
        cb({ ok: false, error: error.message });
      }
    });

    socket.on('sendMessage', async (message, cb) => {
      console.log('Message to send:', message);
      if (typeof cb !== 'function') {
        console.error('Callback is not a function');
        return;
      }
      try {
        const user = await userController.checkUser(socket.id);
        const now = Date.now();

        if (message.startsWith('!Gemini')) {
          if (now - lastGPTCallTime < GPT_COOLDOWN) {
            cb({ ok: false, error: '너무 많은 요청입니다. 몇 초 후에 다시 시도해주세요.' });
            return;
          }
          lastGPTCallTime = now;

          const prompt = message.replace('!Gemini', '').trim();

          // Gemini API 호출
          const model = new googleGenerativeAI.GenerativeModel('gemini-1.5-flash');
          const geminiResponse = await model.generate_content(prompt);

          const geminiMessage = geminiResponse.content;
          const botMessage = {
            chat: `Gemini: ${geminiMessage}`,
            user: { id: null, name: 'Gemini' },
          };
          io.emit('message', botMessage);
          cb({ ok: true });
          return;
        }

        const newMessage = await chatController.saveChat(message, user);
        io.emit('message', newMessage);
        cb({ ok: true });
      } catch (error) {
        console.error('메시지 전송 중 오류 발생:', error);
        cb({ ok: false, error: '메시지 전송 실패: ' + error.message });
      }
    });

    socket.on('userLeave', async (userName, cb) => {
      console.log('User leaving:', userName);
      if (typeof cb !== 'function') {
        console.error('Callback is not a function');
        return;
      }
      if (users[socket.id]) {
        connectedUsers--;
        const leaveMessage = {
          chat: `${userName} 님이 나갔습니다.`,
          user: { id: null, name: 'system' },
        };
        io.emit('message', leaveMessage);
        io.emit('userCount', connectedUsers);
        delete users[socket.id]; // 사용자 정보 삭제
      }
      cb({ ok: true });
    });

    socket.on('disconnect', () => {
      const user = users[socket.id];
      if (user) {
        connectedUsers--;
        const leaveMessage = {
          chat: `${user.name} 님이 나갔습니다.`,
          user: { id: null, name: 'system' },
        };
        io.emit('message', leaveMessage);
        io.emit('userCount', connectedUsers);
        delete users[socket.id]; // 사용자 정보 삭제
      }
      console.log('client disconnected', socket.id);
    });
  });

  io.on('error', (error) => {
    console.error('Server error:', error);
  });
}
