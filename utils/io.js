import { Server } from 'socket.io';
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
import chatController from '../Controllers/chat.controller.js';
import userController from '../Controllers/user.controller.js';

dotenv.config();

// Vertex AI API 초기화
const clientOptions = {
  project: process.env.GOOGLE_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
};

const vertexAI = new VertexAI(clientOptions); 

// API 호출 쿨다운 설정
let lastGPTCallTime = 0;
const GPT_COOLDOWN = 5000;

export default function (io) {
  let connectedUsers = 0;
  const users = {};

  io.on('connection', async (socket) => {
    if (users[socket.id]) {
      console.log('기존 사용자 재연결:', socket.id);
      return;
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
        users[socket.id] = user;
        connectedUsers++;
        io.emit('userCount', connectedUsers);

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

          try {
            // Gemini API 호출
            const generativeModel = vertexAI.getGenerativeModel({
              model: 'gemini-1.5-flash-001',
            });

            const request = {
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
            };

            const responseStream = await generativeModel.generateContentStream(request);
            let fullTextResponse = '';

            // for await...of 루프를 사용하여 스트리밍 응답 처리
            for await (const chunk of responseStream) {
              fullTextResponse += chunk.text;
            }

            const botMessage = {
              chat: `Gemini: ${fullTextResponse}`,
              user: { id: null, name: 'Gemini' },
            };
            io.emit('message', botMessage);
            cb({ ok: true });

          } catch (error) {
            console.error('Gemini API 호출 오류:', error);
            cb({ ok: false, error: 'Gemini API 호출 오류: ' + error.message });
          }
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
        delete users[socket.id];
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
        delete users[socket.id];
      }
      console.log('client disconnected', socket.id);
    });
  });

  io.on('error', (error) => {
    console.error('Server error:', error);
  });
}