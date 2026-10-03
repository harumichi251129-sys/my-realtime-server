import { DurableObject } from "cloudflare:workers";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
};

const ONLINE_TIME = 5000;

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
        if (!data || typeof data !== "object") data = {};

        data[index] = {
            value: value,
            updatedAt: Date.now()
        };

        await this.ctx.storage.put("data", data);
        return value;
    }

    async get(index) {
        let data = await this.ctx.storage.get("data");
        if (!data || typeof data !== "object") return null;

        const item = data[index];
        if (!item) return null;

        if (Date.now() - item.updatedAt > ONLINE_TIME) {
            delete data[index];
            await this.ctx.storage.put("data", data);
            return null;
        }

        return item.value;
    }

    async getAll() {
        let data = await this.ctx.storage.get("data");
        if (!data || typeof data !== "object") return {};

        const now = Date.now();
        let changed = false;
        const result = {};

        for (const index in data) {
            const item = data[index];

            if (!item || typeof item !== "object") {
                delete data[index];
                changed = true;
                continue;
            }

            if (now - item.updatedAt > ONLINE_TIME) {
                delete data[index];
                changed = true;
                continue;
            }

            result[index] = item.value;
        }

        if (changed) {
            await this.ctx.storage.put("data", data);
        }

        return result;
    }

    async clear(index) {
        let data = await this.ctx.storage.get("data");
        if (!data || typeof data !== "object") return {};

        delete data[index];
        await this.ctx.storage.put("data", data);
        return data;
    }

    async delete() {
        await this.ctx.storage.delete("data");
        return {};
    }
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        if (request.method === "POST" && url.pathname === "/send") {
            const body = await request.json();
            const object = env.CLOUD_DATA.getByName(String(body.link));

            return cors(Response.json(
                await object.send(body.value, body.index)
            ));
        }

        if (request.method === "GET" && url.pathname === "/get") {
            const link = String(url.searchParams.get("link"));
            const index = url.searchParams.get("index");
            const object = env.CLOUD_DATA.getByName(link);

            return cors(Response.json(await object.get(index)));
        }

        if (request.method === "GET" && url.pathname === "/getAll") {
            const link = String(url.searchParams.get("link"));
            const object = env.CLOUD_DATA.getByName(link);

            return cors(Response.json(await object.getAll()));
        }

        if (request.method === "POST" && url.pathname === "/clear") {
            const body = await request.json();
            const object = env.CLOUD_DATA.getByName(String(body.link));

            return cors(Response.json(
                await object.clear(body.index)
            ));
        }

        if (request.method === "DELETE" && url.pathname === "/delete") {
            const link = String(url.searchParams.get("link"));
            const object = env.CLOUD_DATA.getByName(link);

            return cors(Response.json(await object.delete()));
        }

        return cors(new Response("Cloud Server OK"));
    }
};
