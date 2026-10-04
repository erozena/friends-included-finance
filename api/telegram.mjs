import { db, json, telegram } from './_lib.mjs';

export default async function (req, res) {
  try {
    if (req.query.secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return json(res, 401, { error: 'Invalid webhook secret' });
    }

    const message = req.body?.message;
    if (!message?.text) return json(res, 200, { ok: true });

    const userId = String(message.from.id);
    const chatId = String(message.chat.id);
    const employees = await db(`employees?telegram_user_id=eq.${encodeURIComponent(userId)}`);

    if (!employees.length) {
      await telegram(chatId, 'Your Telegram account is not linked. Ask Svetlana to link your numeric Telegram user ID in Manager setup.');
      return json(res, 200, { ok: true });
    }

    const employee = employees[0];
    await db(`employees?id=eq.${employee.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linked_chat_id: chatId }),
    });

    const pieces = message.text.split('|').map((item) => item.trim());
    const first = pieces.shift();
    const command = first.split(' ')[0].toLowerCase();
    const reference = first.slice(command.length).trim();
    let transaction;

    if (command === '/sale' && pieces.length === 7) {
      const [customer, project, description, amount, richard, anastasia, jeanClaude] = pieces;
      transaction = { kind: 'sale', reference, customer, project, description, amount, richard, anastasia, jeanClaude };
    } else if (command === '/expense' && pieces.length === 4) {
      const [description, category, amount, proposedAllocation] = pieces;
      transaction = { kind: 'expense', reference, description, category, amount, proposedAllocation };
    } else {
      await telegram(chatId, 'Use /sale REF | Customer | A or B | Description | Amount | Richard% | Anastasia% | Jean-Claude%\nOr /expense REF | Description | Materials, Travel or Other | Amount | A, B or Company overhead');
      return json(res, 200, { ok: true });
    }

    const host = String(req.headers['x-forwarded-host'] || req.headers.host);
    const protocol = String(req.headers['x-forwarded-proto'] || 'https');
    const submit = await fetch(`${protocol}://${host}/api/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...transaction, role: employee.id, origin: 'telegram', chatId }),
    });
    const result = await submit.json();

    if (!submit.ok) {
      const reason = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      await telegram(chatId, `Not recorded: ${reason}`);
    }

    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, 200, { ok: false, error: error.message });
  }
}
