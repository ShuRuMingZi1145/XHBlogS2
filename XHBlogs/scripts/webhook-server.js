#!/usr/bin/env node
/**
 * GitHub Webhook 接收服务
 * 监听 :9000 端口，收到 master 分支 push 事件后调用 deploy-server.sh
 *
 * 启动: pm2 start scripts/webhook-server.js --name webhook
 * 或:   node scripts/webhook-server.js
 */
import http from "node:http";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const PORT = Number(process.env.WEBHOOK_PORT || 9000);
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const DEPLOY_SCRIPT = path.join(PROJECT_ROOT, "scripts", "deploy-server.sh");

let isDeploying = false;

function verifySignature(rawBody, signature) {
  if (!WEBHOOK_SECRET) return true;
  if (!signature) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

function triggerDeploy(reason) {
  if (isDeploying) {
    console.log(`[${new Date().toISOString()}] 部署进行中，忽略本次触发 (${reason})`);
    return;
  }
  isDeploying = true;
  console.log(`[${new Date().toISOString()}] 触发部署 (${reason}) ...`);

  const child = spawn("bash", [DEPLOY_SCRIPT], {
    cwd: PROJECT_ROOT,
    env: process.env,
    stdio: "inherit",
  });
  child.on("exit", (code) => {
    console.log(
      `[${new Date().toISOString()}] 部署脚本退出，code=${code}`
    );
    isDeploying = false;
  });
  child.on("error", (err) => {
    console.error(`[${new Date().toISOString()}] 部署脚本异常:`, err);
    isDeploying = false;
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, deploying: isDeploying }));
    return;
  }

  if (req.method !== "POST" || req.url !== "/webhook") {
    res.writeHead(404);
    res.end("not found");
    return;
  }

  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    const sig = req.headers["x-hub-signature-256"];
    if (!verifySignature(raw, sig)) {
      console.warn(`[${new Date().toISOString()}] 签名校验失败`);
      res.writeHead(401);
      res.end("invalid signature");
      return;
    }

    let event = req.headers["x-github-event"];
    let payload = {};
    try {
      payload = JSON.parse(raw);
    } catch {
      res.writeHead(400);
      res.end("invalid json");
      return;
    }

    if (event === "push" && payload.ref === "refs/heads/master") {
      triggerDeploy(`push by ${payload.pusher?.name || "unknown"}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, message: "deploy triggered" }));
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          message: `ignored (event=${event}, ref=${payload.ref})`,
        })
      );
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `[${new Date().toISOString()}] Webhook 服务监听 0.0.0.0:${PORT}，secret=${
      WEBHOOK_SECRET ? "已配置" : "未配置（任意请求都会触发）"
    }`
  );
});
