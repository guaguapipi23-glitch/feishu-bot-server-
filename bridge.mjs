import 'dotenv/config';
import lark from '@larksuiteoapi/node-sdk';

// 配置
const config = {
  appId: process.env.LARK_APP_ID,
  appSecret: process.env.LARK_APP_SECRET,
};

// 智谱 API 配置
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// 消息去重
const processedEvents = new Set();
const MAX_PROCESSED = 100;

// 创建 Lark 客户端
const client = new lark.Client({
  appId: config.appId,
  appSecret: config.appSecret,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Lark,
});

// 调用智谱 GLM-4-Flash
async function callZhipuGLM(userMessage) {
  const response = await fetch(ZHIPU_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ZHIPU_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'glm-4-flash',
      messages: [
        { role: 'system', content: '你是一个友好、简洁、中文回复的助手' },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`智谱 API 错误: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '抱歉，我暂时无法回答。';
}

// 发送回复到飞书
async function sendReply(chatId, text) {
  await client.im.v1.message.create({
    path: {
      receive_id_type: 'chat_id',
    },
    params: {
      receive_id_type: 'chat_id',
    },
    data: {
      receive_id: chatId,
      msg_type: 'text',
      content: JSON.stringify({ text }),
    },
  });
}

// 处理消息事件
async function handleMessage(data) {
  try {
    const eventId = data.event_id;
    const message = data.message;

    // 去重检查
    if (processedEvents.has(eventId)) {
      console.log(`[跳过] 重复事件: ${eventId}`);
      return;
    }

    // 添加到已处理集合
    processedEvents.add(eventId);
    if (processedEvents.size > MAX_PROCESSED) {
      const first = processedEvents.values().next().value;
      processedEvents.delete(first);
    }

    const chatId = message.chat_id;
    const messageId = message.message_id;

    // 解析消息内容
    let userText = '';
    try {
      const content = JSON.parse(message.content);
      userText = content.text || '';
    } catch (e) {
      console.log('[警告] 无法解析消息内容');
      return;
    }

    // 忽略空消息
    if (!userText.trim()) {
      return;
    }

    console.log(`[收到消息] chat_id: ${chatId}, 内容: ${userText}`);

    // 调用智谱生成回复
    const reply = await callZhipuGLM(userText);
    console.log(`[AI 回复] ${reply}`);

    // 发送回复
    await sendReply(chatId, reply);
    console.log(`[发送成功] 已回复到 ${chatId}`);

  } catch (error) {
    console.error('[处理错误]', error.message);
  }
}

// 创建事件分发器
const dispatcher = new lark.EventDispatcher({});

// 注册消息事件
dispatcher.register({
  'im.message.receive_v1': async (data) => {
    handleMessage(data);
  },
});

// 创建 WebSocket 客户端
const wsClient = new lark.WSClient({
  appId: config.appId,
  appSecret: config.appSecret,
  domain: lark.Domain.Lark,
  logLevel: lark.LogLevel.info,
});

// 启动长连接
async function start() {
  try {
    await wsClient.start(dispatcher);
    console.log('🚀 飞书机器人启动成功，等待消息...');
  } catch (error) {
    console.error('启动失败:', error.message);
    process.exit(1);
  }
}

start();
