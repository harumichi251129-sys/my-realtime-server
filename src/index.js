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

    async send(value, index) {
        let data = await this.ctx.storage.get("data");

        if (!Array.isArray(data)) {
            data = [];
        }

        data[index] = value;

        await this.ctx.storage.put("data", data);

        return data;
    }

    async get() {
        const data = await this.ctx.storage.get("data");

        return Array.isArray(data) ? data : [];
    }

    async delete() {
        await this.ctx.storage.delete("data");

        return [];
    }
}


export default {

    async fetch(request, env) {

        const url = new URL(request.url);

        // CORSプリフライト
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: CORS_HEADERS
            });
        }


        // 書き込み
        if (request.method === "POST" && url.pathname === "/send") {

            const body = await request.json();

            const link = String(body.link);

            const object = env.CLOUD_DATA.getByName(link);

            return cors(
                Response.json(
                    await object.send(
                        body.value,
                        Number(body.index)
                    )
                )
            );
        }


        // 取得
        if (request.method === "GET" && url.pathname === "/get") {

            const link = String(
                url.searchParams.get("link")
            );

            const object = env.CLOUD_DATA.getByName(link);

            return cors(
                Response.json(
                    await object.get()
                )
            );
        }


        // 削除
        if (request.method === "DELETE" && url.pathname === "/delete") {

            const link = String(
                url.searchParams.get("link")
            );

            const object = env.CLOUD_DATA.getByName(link);

            return cors(
                Response.json(
                    await object.delete()
                )
            );
        }


        return cors(
            new Response("Cloud Server OK")
        );
    }
};
