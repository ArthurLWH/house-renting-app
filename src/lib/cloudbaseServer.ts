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
  const token =
    process.env.TENCENTCLOUD_SESSIONTOKEN ||
    process.env.SESSIONTOKEN ||
    process.env.TENCENTCLOUD_TOKEN ||
    process.env.TOKEN;

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
          ...(token
            ? {
                token: getRequiredEnv(
                  process.env.TENCENTCLOUD_SESSIONTOKEN
                    ? "TENCENTCLOUD_SESSIONTOKEN"
                    : process.env.SESSIONTOKEN
                      ? "SESSIONTOKEN"
                      : process.env.TENCENTCLOUD_TOKEN
                        ? "TENCENTCLOUD_TOKEN"
                        : "TOKEN",
                ),
              }
            : {}),
        }
      : {}),
  });

  return app.database();
}

