const DATA = {};

export default {
    async fetch(request) {
        const url = new URL(request.url);
        const path = url.pathname;

        // =========================
        // CORS
        // =========================
        const headers = {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        };

        // =========================
        // OPTIONS
        // =========================
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

            // linkが存在しなければ作成
            if (!DATA[link]) {
                DATA[link] = {};
            }

            // 指定したindexに値を保存
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

            const link = url.searchParams.get("link");

            // link指定あり
            if (link !== null) {

                const data = DATA[String(link)] || {};

                return new Response(
                    JSON.stringify(data),
                    {
                        status: 200,
                        headers
                    }
                );
            }

            // link指定なし
            // → 全データ
            return new Response(
                JSON.stringify(DATA),
                {
                    status: 200,
                    headers
                }
            );
        }


        // =========================
        // GET ALL
        // =========================
        if (path === "/getAll" && request.method === "GET") {

            return new Response(
                JSON.stringify(DATA),
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

            // linkが指定されていない
            if (link === null) {

                return new Response(
                    JSON.stringify({
                        error: "link is required"
                    }),
                    {
                        status: 400,
                        headers
                    }
                );
            }

            // 指定したlinkを削除
            delete DATA[String(link)];

            return new Response(
                JSON.stringify({
                    success: true,
                    link: String(link)
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
                error: "Not Found"
            }),
            {
                status: 404,
                headers
            }
        );
    }
};
