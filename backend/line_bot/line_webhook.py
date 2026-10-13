
"""Handle LINE webhook requests for the AI Travel Planner bot."""

import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, abort, request
from linebot.v3 import WebhookHandler
from linebot.v3.exceptions import InvalidSignatureError
from linebot.v3.messaging import (
    ApiClient,
    Configuration,
    MessagingApi,
    ReplyMessageRequest,
    TextMessage,
)
from linebot.v3.webhooks import MessageEvent, TextMessageContent


# Resolve local configuration relative to this module for consistent startup.
load_dotenv(Path(__file__).resolve().parent / ".env")

CHANNEL_ACCESS_TOKEN = os.environ["LINE_CHANNEL_ACCESS_TOKEN"]
CHANNEL_SECRET = os.environ["LINE_CHANNEL_SECRET"]

app = Flask(__name__)
configuration = Configuration(access_token=CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(CHANNEL_SECRET)


ATTRACTIONS = [
    "淡水老街",
    "淡水漁人碼頭",
    "淡江大橋",
    "沙崙海灘",
    "紅毛城",
    "十三行博物館",
]


def get_attraction_list():
    """Format the predefined attractions for the initial bot demo."""
    return "\n".join(
        f"{index}. {name}"
        for index, name in enumerate(ATTRACTIONS, start=1)
    )


def generate_reply(user_message):
    """Return a response for a supported rich-menu command."""

    if user_message == "我的行程":
        return (
            "我的行程\n\n"
            "目前尚未建立行程。\n"
            "請點選「建立行程」開始規劃旅遊。\n\n"
            "行程儲存功能即將開放。"
        )

    if user_message == "建立行程":
        return (
            "建立行程\n\n"
            "請輸入你想去的景點名稱。\n"
            "例如：淡水老街、紅毛城、漁人碼頭\n\n"
            "目前為測試版本，尚未開放行程儲存。"
        )

    if user_message == "選擇景點":
        return (
            "淡水推薦景點\n\n"
            f"{get_attraction_list()}\n\n"
            "目前為景點清單展示，尚未開放編號選取。"
        )

    if user_message == "查看路線":
        return (
            "查看路線\n\n"
            "目前尚未建立行程，無法顯示路線。\n"
            "請先建立行程，再進行路線規劃。"
        )

    if user_message in ("附近景點", "附近推薦"):
        return (
            "附近景點推薦\n\n"
            f"{get_attraction_list()}\n\n"
            "目前為固定淡水景點清單，"
            "尚未依照使用者目前位置進行推薦。"
        )

    if user_message == "臨時加景點":
        return (
            "臨時加景點\n\n"
            "未來可以在旅途中新增景點，"
            "並設定最多願意繞路的時間。\n\n"
            "此功能目前正在開發中。"
        )

    if user_message == "使用說明":
        return (
            "AI Travel Planner 使用說明\n\n"
            "1. 我的行程：查看已儲存的行程。\n"
            "2. 建立行程：輸入想去的景點。\n"
            "3. 選擇景點：瀏覽推薦景點。\n"
            "4. 查看路線：查看規劃路線。\n"
            "5. 附近景點：探索周邊景點。\n"
            "6. 臨時加景點：旅途中調整行程。\n\n"
            "目前部分功能仍在開發中。"
        )

    return (
        "目前無法辨識這個指令。\n\n"
        "請點選下方圖文選單使用功能。"
    )


@app.route("/", methods=["GET"])
def home():
    """Provide a basic service availability endpoint."""
    return "Travel LINE Bot is running!"


@app.route("/callback", methods=["POST"])
def callback():
    """Validate and process incoming LINE webhook requests."""
    signature = request.headers.get("X-Line-Signature", "")
    body = request.get_data(as_text=True)

    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        abort(400)

    return "OK"


@handler.add(MessageEvent, message=TextMessageContent)
def handle_message(event):
    """Reply to incoming LINE text messages."""
    user_message = event.message.text.strip()
    reply_text = generate_reply(user_message)

    with ApiClient(configuration) as api_client:
        line_bot_api = MessagingApi(api_client)
        line_bot_api.reply_message(
            ReplyMessageRequest(
                reply_token=event.reply_token,
                messages=[TextMessage(text=reply_text)],
            )
        )


if __name__ == "__main__":
    app.run(port=5000)
