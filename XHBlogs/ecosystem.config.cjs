module.exports = {
  apps: [
    {
      name: "xhblog-next",
      cwd: __dirname,
      script: ".next/standalone/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
        HOSTNAME: "0.0.0.0",
      },
      max_memory_restart: "512M",
    },
    {
      name: "xhblog-webhook",
      cwd: __dirname,
      script: "scripts/webhook-server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        WEBHOOK_PORT: 9000,
      },
      max_memory_restart: "256M",
    },
  ],
};
