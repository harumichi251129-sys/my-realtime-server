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
            JSON.stringify(DATA[String(link)] || {}),
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
