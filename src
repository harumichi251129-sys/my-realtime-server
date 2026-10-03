import { DurableObject } from "cloudflare:workers";

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

        if (request.method === "POST" && url.pathname === "/send") {
            const body = await request.json();

            const object = env.CLOUD_DATA.getByName(body.link);

            return Response.json(
                await object.send(body.value, body.index)
            );
        }

        if (request.method === "GET" && url.pathname === "/get") {
            const link = url.searchParams.get("link");

            const object = env.CLOUD_DATA.getByName(link);

            return Response.json(
                await object.get()
            );
        }

        if (request.method === "DELETE" && url.pathname === "/delete") {
            const link = url.searchParams.get("link");

            const object = env.CLOUD_DATA.getByName(link);

            return Response.json(
                await object.delete()
            );
        }

        return new Response("Cloud Server OK");
    }
};
