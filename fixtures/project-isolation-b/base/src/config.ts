export interface Config {
  port: number;
  environment: 'development' | 'production';
  dbPoolMax: number;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '4000', 10),
  environment: (process.env.NODE_ENV as 'development' | 'production') || 'development',
  dbPoolMax: parseInt(process.env.DB_POOL_MAX || '5', 10),
};
