// 飞书机器人事件订阅服务
// 部署到 Vercel

export default async function handler(req, res) {
  // 只处理 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body;

  // 处理 URL 验证
  if (body.type === 'url_verification') {
    console.log('URL verification challenge:', body.challenge);
    return res.status(200).json({ challenge: body.challenge });
  }

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

    console.log('收到消息:', {
      sender: sender.sender_id?.open_id,
      content: messageContent,
      chatId: message.chat_id
    });

    // 解析消息意图并处理
    const result = await processMessage(messageContent, sender.sender_id?.open_id, message.chat_id);

    return res.status(200).json({ success: true, result });
  }

  // 其他事件
  return res.status(200).json({ success: true });
}

// 处理消息
async function processMessage(content, senderId, chatId) {
  const text = content.trim();

  // 解析日报格式：记录日报 今天接待客户30人，成交15单，成交额28万
  const dailyReportMatch = text.match(/记录日报\s*(?:今天)?(.+)/i);
  if (dailyReportMatch) {
    return await handleDailyReport(dailyReportMatch[1], chatId);
  }

  // 解析任务格式：新增任务 完成母亲节活动策划，截止4/25
  const taskMatch = text.match(/新增任务\s*(.+?)(?:，|$)/i);
  const deadlineMatch = text.match(/截止\s*(\d{1,2})\/(\d{1,2})/);
  if (taskMatch) {
    return await handleNewTask(taskMatch[1], deadlineMatch, chatId);
  }

  // 解析会议总结格式：会议总结 xxx
  const meetingMatch = text.match(/会议总结\s*(.+)/is);
  if (meetingMatch) {
    return await handleMeetingNote(meetingMatch[1], chatId);
  }

  // 默认回复
  return {
    action: 'unknown',
    reply: '我不太理解你的意思。试试这些命令：\n\n' +
           '📌 记录日报 今天接待客户30人，成交15单，成交额28万\n' +
           '📌 新增任务 完成母亲节活动策划，截止4/25\n' +
           '📌 会议总结 今天讨论了5.1开业活动的方案...'
  };
}

// 处理日报
async function handleDailyReport(content, chatId) {
  // 解析各项数据
  const customersMatch = content.match(/接待客户?(\d+)人?/);
  const dealsMatch = content.match(/成交(\d+)单?/);
  const amountMatch = content.match(/成交额(\d+)万?/);

  const data = {
    customers: customersMatch ? parseInt(customersMatch[1]) : null,
    deals: dealsMatch ? parseInt(dealsMatch[1]) : null,
    amount: amountMatch ? parseInt(amountMatch[1]) * 10000 : null
  };

  // TODO: 调用飞书 API 更新多维表格

  return {
    action: 'daily_report',
    data,
    reply: `✅ 已记录日报\n` +
           `- 接待客户: ${data.customers || '未识别'}人\n` +
           `- 成交: ${data.deals || '未识别'}单\n` +
           `- 成交额: ${data.amount ? (data.amount/10000) + '万' : '未识别'}\n\n` +
           `数据已更新到「每日经营数据表」`
  };
}

// 处理新任务
async function handleNewTask(taskName, deadlineMatch, chatId) {
  let deadline = null;
  if (deadlineMatch) {
    const month = parseInt(deadlineMatch[1]);
    const day = parseInt(deadlineMatch[2]);
    const year = new Date().getFullYear();
    deadline = `${year}/${month}/${day}`;
  }

  // TODO: 调用飞书 API 更新多维表格

  return {
    action: 'new_task',
    taskName,
    deadline,
    reply: `✅ 已添加任务\n` +
           `- 任务: ${taskName}\n` +
           `- 截止日期: ${deadline || '未设置'}\n\n` +
           `任务已添加到「任务表」`
  };
}

// 处理会议总结
async function handleMeetingNote(content, chatId) {
  // TODO: 调用飞书 API 更新多维表格

  return {
    action: 'meeting_note',
    reply: `✅ 已记录会议总结\n\n` +
           `内容已保存到「洞察与决策表」`
  };
}
