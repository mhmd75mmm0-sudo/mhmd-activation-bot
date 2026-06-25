export default {
  async fetch(request, env, ctx) {
    return new Response(
      JSON.stringify({
        status: "success",
        project: "MHMD Activation Bot",
        message: "Worker is running successfully!"
      }, null, 2),
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
};
