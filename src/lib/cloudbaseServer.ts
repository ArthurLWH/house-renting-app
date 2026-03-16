import cloudbase from "@cloudbase/node-sdk";

function getRequiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function getCloudbaseDb() {
  // CloudBase 云托管可以“注入 API Key”；本地/其他环境可用手动 env。
  const envId =
    process.env.CLOUDBASE_ENV_ID ||
    process.env.TCB_ENV ||
    process.env.SCF_NAMESPACE ||
    "";

  if (!envId) {
    throw new Error(
      "Missing CloudBase env id. Set CLOUDBASE_ENV_ID (or enable CloudBase env injection).",
    );
  }

  const secretId = process.env.TENCENTCLOUD_SECRETID || process.env.SECRETID;
  const secretKey = process.env.TENCENTCLOUD_SECRETKEY || process.env.SECRETKEY;

  const app = cloudbase.init({
    env: envId,
    ...(secretId && secretKey
      ? {
          secretId: getRequiredEnv(
            process.env.TENCENTCLOUD_SECRETID ? "TENCENTCLOUD_SECRETID" : "SECRETID",
          ),
          secretKey: getRequiredEnv(
            process.env.TENCENTCLOUD_SECRETKEY ? "TENCENTCLOUD_SECRETKEY" : "SECRETKEY",
          ),
        }
      : {}),
  });

  return app.database();
}

