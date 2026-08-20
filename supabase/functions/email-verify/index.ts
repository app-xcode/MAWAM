Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);

    const token = url.searchParams.get("token");
    const redirect = url.searchParams.get("redirect");

    if (!token || !redirect) {
      return new Response("Missing token or redirect parameter", {
        status: 400,
      });
    }

    const supabaseUrl = "https://crzymkebjvqhqlvjhrwb.supabase.co";

    const verifyUrl =
      `${supabaseUrl}/auth/v1/verify` +
      `?token=${encodeURIComponent(token)}` +
      `&type=signup` +
      `&redirect_to=${encodeURIComponent(redirect)}`;

    const response = await fetch(verifyUrl, {
      method: "GET",
      redirect: "manual",
    });

    const location = response.headers.get("location");

    if (location) {
      const hash = new URL(location).hash;

      return Response.redirect(`${redirect}${hash}`, 302);
    }

    return new Response(await response.text(), {
      status: response.status,
    });

  } catch (err) {
    return new Response(String(err), {
      status: 500,
    });
  }
});