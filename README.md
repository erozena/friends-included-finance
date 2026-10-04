# Friends Included finance system

Deploy this folder to Vercel after applying `supabase/schema.sql` in a new Supabase project. The browser contains no secret credentials; all API work runs in Vercel functions.

## Fast setup

1. Create a Supabase project, open **SQL Editor**, and run `supabase/schema.sql`.
2. Create a Google Sheet with two tabs named **Sales** and **Expenses**. Share it as **Editor** with the Google service-account email. Enable the Google Sheets API and create that service account/key.
3. Create a Telegram bot with BotFather. Have each test recipient press **Start**. In Vercel add every value in `.env.example` as an environment variable, then deploy.
4. In the deployed site, set the Telegram webhook to `https://YOUR-VERCEL-DOMAIN/api/telegram?secret=YOUR_TELEGRAM_WEBHOOK_SECRET` using Bot API `setWebhook`. As Svetlana, use **Telegram setup** to link your Telegram numeric user ID to Richard, submit S01 through the bot, change the link to Kevin, and submit E01.
5. Run the remaining Test 1 and Test 2 entries from the website. Add Vercel, Sheet, bot and GitHub links in Vercel environment variables so they appear in the submission page.

## Telegram commands

`/sale S01 | Olivia Rose | A | One proud uncle and an emotional grandmother | 1000 | 50 | 30 | 20`

`/expense E01 | Rented suit and fake pearl necklace for the relatives | Materials | 120 | A`

The bot accepts `A`, `B`, or `Company overhead` for an expense allocation. Telegram users can only be linked from the Svetlana website view.

## Expected result after both tests

Approved income €5,300; commissions €530; allocated project expenses €540; overhead €160; awaiting allocation €140; company result €3,930. S05 remains pending and E07 remains awaiting allocation.

## Notes

Supabase is the source of truth. Google Sheets uses reference-based upserts, so approval and retry update the same row. Failed Sheet and Telegram operations are recorded and can be retried from the manager view.
