
import { DurableObject } from "cloudflare:workers";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
};

const REGISTRY = "__cloud_registry_v1__";

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
    async send(value, index) {
        let data = await this.ctx.storage.get("data");

        if (!data || typeof data !== "object" || Array.isArray(data)) {
            data = {};
        }

        data[index] = value;

        await this.ctx.storage.put("data", data);

        const message = JSON.stringify({
            type: "update",
            data
        });

        for (const socket of this.ctx.getWebSockets()) {
            if (socket.readyState === WebSocket.OPEN) {
                try {
                    socket.send(message);
                } catch {}
            }
        }

        return data;
    }

    async get() {
        const data = await this.ctx.storage.get("data");

        if (!data || typeof data !== "object" || Array.isArray(data)) {
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

        for (const socket of this.ctx.getWebSockets()) {
            if (socket.readyState === WebSocket.OPEN) {
                try {
                    socket.send(message);
                } catch {}
            }
        }

        return {};
    }

    // 全アドレス管理用
    async register(link, data) {
        let all = await this.ctx.storage.get("all");

        if (!all || typeof all !== "object" || Array.isArray(all)) {
            all = {};
        }

        all[link] = data;

        await this.ctx.storage.put("all", all);

        return all;
    }

    async unregister(link) {
        let all = await this.ctx.storage.get("all");

        if (!all || typeof all !== "object" || Array.isArray(all)) {
            all = {};
        }

        delete all[link];

        await this.ctx.storage.put("all", all);

        return all;
    }

    async getAll() {
        const all = await this.ctx.storage.get("all");

        if (!all || typeof all !== "object" || Array.isArray(all)) {
            return {};
        }

        return all;
    }

    async fetch(request) {
        if (request.headers.get("Upgrade") !== "websocket") {
            return new Response("WebSocket Required", {
                status: 426
            });
        }

        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);

        this.ctx.acceptWebSocket(server);

        return new Response(null, {
            status: 101,
            webSocket: client
        });
    }

    async webSocketMessage(ws, message) {}

    async webSocketClose(ws, code, reason) {
        try {
            ws.close(code, reason);
        } catch {}
    }

    async webSocketError(ws, error) {
        console.error("WebSocket error:", error);
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

        // データ送信
        if (request.method === "POST" && url.pathname === "/send") {
            const body = await request.json();

            if (body.link == null || body.index == null) {
                return cors(Response.json(
                    { error: "link and index are required" },
                    { status: 400 }
                ));
            }

            const link = String(body.link);

            if (link === REGISTRY) {
                return cors(Response.json(
                    { error: "Reserved link" },
                    { status: 400 }
                ));
            }

            const object = env.CLOUD_DATA.getByName(link);
            const data = await object.send(body.value, body.index);

            const registry = env.CLOUD_DATA.getByName(REGISTRY);
            await registry.register(link, data);

            return cors(Response.json(data));
        }

        // データ取得・全件取得
        if (request.method === "GET" && url.pathname === "/get") {
            if (url.searchParams.get("all") === "true") {
                const registry = env.CLOUD_DATA.getByName(REGISTRY);

                return cors(Response.json(
                    await registry.getAll()
                ));
            }

            const link = url.searchParams.get("link");

            if (link == null) {
                return cors(Response.json(
                    { error: "link is required" },
                    { status: 400 }
                ));
            }

            const object = env.CLOUD_DATA.getByName(String(link));

            return cors(Response.json(
                await object.get()
            ));
        }

        // データ削除
        if (request.method === "DELETE" && url.pathname === "/delete") {
            const link = url.searchParams.get("link");

            if (link == null) {
                return cors(Response.json(
                    { error: "link is required" },
                    { status: 400 }
                ));
            }

            if (String(link) === REGISTRY) {
                return cors(Response.json(
                    { error: "Reserved link" },
                    { status: 400 }
                ));
            }

            const object = env.CLOUD_DATA.getByName(String(link));
            const data = await object.delete();

            const registry = env.CLOUD_DATA.getByName(REGISTRY);
            await registry.unregister(String(link));

            return cors(Response.json(data));
        }

        // WebSocket監視
        if (request.method === "GET" && url.pathname === "/watch") {
            if (request.headers.get("Upgrade") !== "websocket") {
                return cors(new Response("WebSocket Required", {
                    status: 426
                }));
            }

            const link = url.searchParams.get("link");

            if (link == null || String(link) === REGISTRY) {
                return cors(Response.json(
                    { error: "Invalid link" },
                    { status: 400 }
                ));
            }

            const object = env.CLOUD_DATA.getByName(String(link));

            return object.fetch(request);
        }

        return cors(new Response("Cloud Server OK"));
    }
};
