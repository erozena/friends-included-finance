import { db, json, read, requireManager } from './_lib.mjs';

export default async function (req, res) {
  try {
    const body = read(req);
    requireManager(body.role);

    if (!['richard', 'anastasia', 'jean-claude', 'kevin'].includes(body.employee) || !body.telegramUserId) {
      throw new Error('Choose an employee and numeric Telegram user ID.');
    }

    const matches = await db(
      `employees?telegram_user_id=eq.${encodeURIComponent(body.telegramUserId)}&select=id,linked_chat_id`,
    );
    const chatId = matches[0]?.linked_chat_id || null;

    if (matches[0] && matches[0].id !== body.employee) {
      await db(`employees?id=eq.${matches[0].id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_user_id: null, linked_chat_id: null }),
      });
    }

    await db(`employees?id=eq.${body.employee}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegram_user_id: String(body.telegramUserId),
        linked_chat_id: chatId,
      }),
    });

    json(res, 200, {
      message: chatId
        ? 'Linked; a started chat is available.'
        : 'Linked. Ask this user to press Start in the bot to save their chat ID.',
    });
  } catch (error) {
    json(res, 400, { error: error.message });
  }
}
