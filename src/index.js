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

        if (!data || typeof data !== "object") {
            data = {};
        }

        data[index] = value;

        await this.ctx.storage.put("data", data);

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

        return {};
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

        return cors(
            new Response("Cloud Server OK")
        );
    }
};
