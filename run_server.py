import asyncio
import os
import sys
import webbrowser
from pathlib import Path
from urllib.parse import urlencode

from aiohttp import ClientSession, WSMsgType, web
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "8080"))
GEMINI_MODEL = "gemini-1.5-flash"
DEEPGRAM_LISTEN_URL = "wss://api.deepgram.com/v1/listen"
DEEPGRAM_OPTIONS = {
    "smart_format": "true",
    "interim_results": "true",
    "punctuate": "true",
}


def get_configured_secret(name):
    value = os.environ.get(name, "").strip()
    if not value or value.lower().startswith("your_"):
        return ""
    return value


async def status(request):
    return web.json_response({
        "geminiConfigured": bool(get_configured_secret("GEMINI_API_KEY")),
        "deepgramConfigured": bool(get_configured_secret("DEEPGRAM_API_KEY")),
    })


async def gemini_generate(request):
    api_key = get_configured_secret("GEMINI_API_KEY")
    if not api_key:
        return web.json_response({"error": "GEMINI_API_KEY is not configured in the server .env file."}, status=503)
    try:
        body = await request.json()
    except (ValueError, TypeError):
        return web.json_response({"error": "Request body must be valid JSON."}, status=400)

    upstream_url = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?{}".format(
        GEMINI_MODEL, urlencode({"key": api_key})
    )
    try:
        async with request.app["http"].post(upstream_url, json=body) as upstream:
            response_body = await upstream.read()
            return web.Response(
                body=response_body,
                status=upstream.status,
                content_type=upstream.headers.get("Content-Type", "application/json").split(";", 1)[0],
            )
    except Exception as error:
        print("[FocusPulse] Gemini proxy request failed: {}".format(error), file=sys.stderr)
        return web.json_response({"error": "Gemini request failed. Check the local server log."}, status=502)


async def deepgram_stream(request):
    api_key = get_configured_secret("DEEPGRAM_API_KEY")
    if not api_key:
        return web.json_response({"error": "DEEPGRAM_API_KEY is not configured in the server .env file."}, status=503)

    params = dict(DEEPGRAM_OPTIONS)
    for name in ("model", "language", "encoding", "sample_rate", "channels", "endpointing", "utterance_end_ms"):
        value = request.query.get(name)
        if value:
            params[name] = value
    upstream_url = "{}?{}".format(DEEPGRAM_LISTEN_URL, urlencode(params))
    client_socket = web.WebSocketResponse(heartbeat=30, max_msg_size=0)
    await client_socket.prepare(request)

    try:
        async with request.app["http"].ws_connect(
            upstream_url,
            headers={"Authorization": "Token " + api_key},
            heartbeat=30,
            max_msg_size=0,
        ) as upstream_socket:
            async def client_to_deepgram():
                async for message in client_socket:
                    if message.type == WSMsgType.BINARY:
                        await upstream_socket.send_bytes(message.data)
                    elif message.type == WSMsgType.TEXT:
                        await upstream_socket.send_str(message.data)
                    elif message.type in (WSMsgType.CLOSE, WSMsgType.CLOSED, WSMsgType.ERROR):
                        break

            async def deepgram_to_client():
                async for message in upstream_socket:
                    if message.type == WSMsgType.BINARY:
                        await client_socket.send_bytes(message.data)
                    elif message.type == WSMsgType.TEXT:
                        await client_socket.send_str(message.data)
                    elif message.type in (WSMsgType.CLOSE, WSMsgType.CLOSED, WSMsgType.ERROR):
                        break

            tasks = [
                asyncio.create_task(client_to_deepgram()),
                asyncio.create_task(deepgram_to_client()),
            ]
            _, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for task in pending:
                task.cancel()
            await asyncio.gather(*pending, return_exceptions=True)
    except Exception as error:
        print("[FocusPulse] Deepgram proxy stream failed: {}".format(error), file=sys.stderr)
        if not client_socket.closed:
            await client_socket.close(code=1011, message=b"Deepgram upstream unavailable")
    return client_socket


async def static_file(request):
    requested = request.match_info.get("path", "") or "index.html"
    relative = Path(requested)
    if any(part.startswith(".") for part in relative.parts):
        raise web.HTTPNotFound()
    target = (ROOT / relative).resolve()
    if ROOT not in target.parents and target != ROOT:
        raise web.HTTPNotFound()
    if not target.is_file():
        raise web.HTTPNotFound()
    return web.FileResponse(target)


async def on_startup(app):
    app["http"] = ClientSession()
    if os.environ.get("FOCUSPULSE_NO_BROWSER") != "1":
        asyncio.get_running_loop().call_later(0.5, webbrowser.open, "http://localhost:{}/index.html".format(PORT))


async def on_cleanup(app):
    await app["http"].close()


def create_app():
    load_dotenv(dotenv_path=ROOT / ".env")
    app = web.Application(client_max_size=2 * 1024 * 1024)
    app.on_startup.append(on_startup)
    app.on_cleanup.append(on_cleanup)
    app.router.add_get("/api/status", status)
    app.router.add_post("/api/gemini", gemini_generate)
    app.router.add_get("/api/deepgram", deepgram_stream)
    app.router.add_get("/{path:.*}", static_file)
    return app


def main():
    app = create_app()
    url = "http://localhost:{}/index.html".format(PORT)
    print("=" * 60)
    print("  FocusPulse AI — PR 007 | DEFINE 4.0 Local Dev Server")
    print("  Serving at: {}".format(url))
    print("  Provider keys: {}".format("configured" if get_configured_secret("GEMINI_API_KEY") or get_configured_secret("DEEPGRAM_API_KEY") else "missing (.env)"))
    print("  Press Ctrl+C to stop the server")
    print("=" * 60)
    try:
        web.run_app(app, host="127.0.0.1", port=PORT, print=None)
    except OSError as error:
        if getattr(error, "errno", None) == 48:
            print("\n[ERROR] Port {} is already in use by another process.".format(PORT), file=sys.stderr)
            print("To free port {}, run: lsof -ti :{} | xargs kill -9\n".format(PORT, PORT), file=sys.stderr)
            sys.exit(1)
        raise


if __name__ == "__main__":
    main()