import { DurableObject } from "cloudflare:workers";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
};

function cors(response) {
    const headers = new Headers(response.headers);

    for (const [key, value] of Object.entries(CORS_HEADERS)) {
        headers.set(key, value);
    }

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
    });
}

export class CloudData extends DurableObject {

    constructor(ctx, env) {
        super(ctx, env);

        this.sessions = new Set();
    }

    async send(value, index) {

        let data = await this.ctx.storage.get("data");

        if (!data || typeof data !== "object") {
            data = {};
        }

        data[index] = value;

        await this.ctx.storage.put("data", data);

        // 更新されたことを接続中のクライアントへ通知
        const message = JSON.stringify({
            type: "update",
            value: value,
            index: index,
            data: data
        });

        for (const websocket of this.sessions) {

            try {
                websocket.send(message);
            } catch {
                this.sessions.delete(websocket);
            }
        }

        return data;
    }

    async get() {

        const data = await this.ctx.storage.get("data");

        if (!data || typeof data !== "object") {
            return {};
        }

        return data;
    }

    async delete() {

        await this.ctx.storage.delete("data");

        const message = JSON.stringify({
            type: "delete",
            data: {}
        });

        for (const websocket of this.sessions) {

            try {
                websocket.send(message);
            } catch {
                this.sessions.delete(websocket);
            }
        }

        return {};
    }

    async fetch(request) {

        // WebSocket接続
        if (
            request.method === "GET" &&
            request.headers.get("Upgrade") === "websocket"
        ) {

            const pair = new WebSocketPair();

            const client = pair[0];
            const server = pair[1];

            server.accept();

            this.sessions.add(server);

            server.addEventListener("close", () => {
                this.sessions.delete(server);
            });

            server.addEventListener("error", () => {
                this.sessions.delete(server);
            });

            // 現在のデータを最初に送信
            const data = await this.get();

            server.send(JSON.stringify({
                type: "connected",
                data: data
            }));

            return new Response(null, {
                status: 101,
                webSocket: client
            });
        }

        return new Response("Cloud Data");
    }
}

export default {

    async fetch(request, env) {

        const url = new URL(request.url);

        if (request.method === "OPTIONS") {

            return new Response(null, {
                status: 204,
                headers: CORS_HEADERS
            });

        }

        /*
         * データ送信
         */

        if (
            request.method === "POST" &&
            url.pathname === "/send"
        ) {

            const body = await request.json();

            const link = String(body.link);

            const object =
                env.CLOUD_DATA.getByName(link);

            return cors(
                Response.json(
                    await object.send(
                        body.value,
                        body.index
                    )
                )
            );
        }

        /*
         * データ取得
         */

        if (
            request.method === "GET" &&
            url.pathname === "/get"
        ) {

            const link =
                String(url.searchParams.get("link"));

            const object =
                env.CLOUD_DATA.getByName(link);

            return cors(
                Response.json(
                    await object.get()
                )
            );
        }

        /*
         * データ削除
         */

        if (
            request.method === "DELETE" &&
            url.pathname === "/delete"
        ) {

            const link =
                String(url.searchParams.get("link"));

            const object =
                env.CLOUD_DATA.getByName(link);

            return cors(
                Response.json(
                    await object.delete()
                )
            );
        }

        /*
         * WebSocket
         *
         * /watch?link=アドレス
         */

        if (
            request.method === "GET" &&
            url.pathname === "/watch"
        ) {

            if (
                request.headers.get("Upgrade") !== "websocket"
            ) {

                return cors(
                    new Response(
                        "WebSocket Required",
                        { status: 426 }
                    )
                );

            }

            const link =
                String(url.searchParams.get("link"));

            const object =
                env.CLOUD_DATA.getByName(link);

            return object.fetch(request);
        }

        return cors(
            new Response("Cloud Server OK")
        );
    }
};
