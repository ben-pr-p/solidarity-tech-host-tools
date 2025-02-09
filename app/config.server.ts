import { cleanEnv, str } from "envalid";

export type Config = ReturnType<typeof getConfig>;

export const getConfig = (env: Record<string, string>) => {
  return cleanEnv(env, {
    SOLIDARITY_TECH_API_KEY: str(),
    ROOT_REDIRECT_URL: str(),
    SYMMETRIC_ENCRYPTION_KEY: str(),
    APP_TITLE: str(),
    BASE_URL: str(),
    ADMIN_PASSWORD: str(),
    FAVICON_URL: str(),
    META_SHARE_IMAGE_URL: str(),
    META_DESCRIPTION: str(),
    META_TITLE: str(),
    META_TITLE_HOST_PREFIX: str(),
    HEADER_BACKGROUND_COLOR: str(),
    HEADER_TEXT_COLOR: str(),
  });
};
