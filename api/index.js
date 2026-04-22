// 飞书机器人事件订阅服务 - 优化版
// 部署到 Vercel

export default async function handler(req, res) {
  // ===== 快速响应 URL 验证（必须在最前面）=====
  if (req.method === 'POST') {
    const body = req.body;

    // URL 验证 - 立即返回，不做任何其他操作
    if (body?.type === 'url_verification') {
      return res.status(200).json({ challenge: body.challenge });
    }
  }

  // ===== 以下是消息处理逻辑 =====

  // 只处理 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;

    // 处理消息事件
    if (body.header?.event_type === 'im.message.receive_v1') {
      const event = body.event;
      const message = event.message;
      const sender = event.sender;

      // 解析消息内容
      let messageContent = '';
      try {
        const content = JSON.parse(message.content);
        messageContent = content.text || '';
      } catch (e) {
        messageContent = message.content;
      }

      // 异步处理消息（不阻塞响应）
      processMessage(messageContent, sender.sender_id?.open_id, message.chat_id).catch(console.error);

      // 立即返回成功
      return res.status(200).json({ success: true });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error:', error);
    return res.status(200).json({ success: true });
  }
}

// 处理消息
async function processMessage(content, senderId, chatId) {
  const text = content.trim();

  // 解析日报格式
  if (/记录日报/i.test(text)) {
    console.log('收到日报:', text);
    // TODO: 更新多维表格
    return;
  }

  // 解析任务格式
  if (/新增任务/i.test(text)) {
    console.log('收到新任务:', text);
    // TODO: 更新多维表格
    return;
  }

  // 解析会议总结格式
  if (/会议总结/i.test(text)) {
    console.log('收到会议总结:', text);
    // TODO: 更新多维表格
    return;
  }

  console.log('未识别的消息:', text);
}
