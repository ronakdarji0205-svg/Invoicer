module.exports = {
  apps: [
    {
      name: 'pro-invoicer-dev',
      script: 'npm',
      args: 'run dev:all',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: ['src', 'backend'],
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 6002,
        VITE_PORT: 6001
      },
      error_file: './logs/dev-error.log',
      out_file: './logs/dev-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    }
  ]
};
