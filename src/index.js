const DATA = {};

export default {
    async fetch(request) {

        const url = new URL(request.url);
        const path = url.pathname;

        const headers = {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        };

        // CORS
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers
            });
        }

        // =========================
        // SEND
        // =========================
        if (path === "/send" && request.method === "POST") {

            const body = await request.json();

            const value = body.value;
            const index = String(body.index);
            const link = String(body.link);

            if (!DATA[link]) {
                DATA[link] = {};
            }

            DATA[link][index] = value;

            return new Response(
                JSON.stringify({
                    success: true,
                    link: link,
                    index: index,
                    value: value
                }),
                {
                    status: 200,
                    headers
                }
            );
        }

        // =========================
        // GET
        // =========================
        if (path === "/get" && request.method === "GET") {

            const all = url.searchParams.get("all");
            const link = url.searchParams.get("link");

            // 全データ
            if (all === "true") {

                return new Response(
                    JSON.stringify(DATA),
                    {
                        status: 200,
                        headers
                    }
                );
            }

            // 特定のアドレス
            if (link !== null) {

                return new Response(
                    JSON.stringify(
                        DATA[String(link)] || {}
                    ),
                    {
                        status: 200,
                        headers
                    }
                );
            }

            return new Response(
                JSON.stringify({}),
                {
                    status: 200,
                    headers
                }
            );
        }

        // =========================
        // DELETE
        // =========================
        if (path === "/delete" && request.method === "DELETE") {

            const link = url.searchParams.get("link");

            if (link === null) {

                return new Response(
                    JSON.stringify({
                        success: false,
                        error: "link is required"
                    }),
                    {
                        status: 400,
                        headers
                    }
                );
            }

            const key = String(link);

            // 削除前に存在確認
            const existed = Object.prototype.hasOwnProperty.call(
                DATA,
                key
            );

            delete DATA[key];

            return new Response(
                JSON.stringify({
                    success: true,
                    link: key,
                    deleted: existed
                }),
                {
                    status: 200,
                    headers
                }
            );
        }

        // =========================
        // NOT FOUND
        // =========================
        return new Response(
            JSON.stringify({
                success: false,
                error: "Not Found"
            }),
            {
                status: 404,
                headers
            }
        );
    }
};
