Deno.serve(async (req) => {
  try {
    const { url, method = "GET", headers = {}, body } = await req.json();

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const contentType = res.headers.get("content-type") || "application/json";

    return new Response(await res.text(), {
      status: res.status,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return Response.json(
      {
        success: false,
        message: e.message,
      },
      { status: 500 }
    );
  }
});