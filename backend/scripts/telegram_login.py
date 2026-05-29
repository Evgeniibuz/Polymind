"""One-time interactive Telegram login — generates a session string.

Run locally:  python -m scripts.telegram_login

It will prompt for your phone number and the code Telegram sends you.
Copy the printed session string into TELEGRAM_SESSION in your .env.
"""

import asyncio

from app.core.config import settings


async def main() -> None:
    from telethon import TelegramClient
    from telethon.sessions import StringSession

    if not (settings.telegram_api_id and settings.telegram_api_hash):
        print("Set TELEGRAM_API_ID and TELEGRAM_API_HASH in .env first.")
        print("Get them from https://my.telegram.org → API development tools")
        return

    client = TelegramClient(
        StringSession(), settings.telegram_api_id, settings.telegram_api_hash
    )
    await client.start()  # interactive prompts for phone + code
    session_str = client.session.save()
    print("\n" + "=" * 60)
    print("Your TELEGRAM_SESSION (paste into .env):")
    print(session_str)
    print("=" * 60)
    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
