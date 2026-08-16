const SUPABASE_URL = "https://crzymkebjvqhqlvjhrwb.supabase.co";
const allowedTypes = new Set(["signup", "recovery", "email_change"]);

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const redirectTo = url.searchParams.get("redirect_to") || url.searchParams.get("redirect");
    const type = url.searchParams.get("type") || "signup";

    if (!token || !redirectTo) {
      return new Response("Missing token or redirect parameter", { status: 400 });
    }

    if (!allowedTypes.has(type)) {
      return new Response("Unsupported verification type", { status: 400 });
    }

    const verifyUrl = new URL("/auth/v1/verify", SUPABASE_URL);
    verifyUrl.searchParams.set("token", token);
    verifyUrl.searchParams.set("type", type);
    verifyUrl.searchParams.set("redirect_to", redirectTo);

    const response = await fetch(verifyUrl, {
      method: "GET",
      redirect: "manual",
    });
    const location = response.headers.get("location");

    if (location) {
      const hash = new URL(location).hash;
      return Response.redirect(`${redirectTo}${hash}`, 302);
    }

    return new Response(await response.text(), {
      status: response.status,
    });
  } catch (error) {
    return new Response(String(error), { status: 500 });
  }
});
