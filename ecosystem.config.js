// ecosystem.config.js — PM2 config for production VPS
module.exports = {
  apps: [
    {
      name: "autohire",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/autohire",
      instances: 1,           // increase to "max" for cluster mode
      exec_mode: "fork",       // use "cluster" for multi-core
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Logging
      out_file: "/var/log/autohire/out.log",
      error_file: "/var/log/autohire/error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
}
