module.exports = {
  apps: [
    {
      name: 'office-designer',
      cwd: '/home/ftherese/office-designer',
      // Run the Next binary directly. Going through `npm run start` adds a
      // 75MB npm process and a shell in front of the server, and means PM2
      // signals npm instead of Next on restart/stop.
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 4001',
      interpreter: '/home/ftherese/.nvm/versions/node/v22.23.1/bin/node',
      watch: false,
      autorestart: true,

      // Restart guards. Without these a port collision spins forever: this
      // app logged 52,651 restarts against `EADDRINUSE :::4001`, reaching
      // "Ready" only 88 times. Now a start must survive 30s to count, the
      // delay backs off after each failure, and PM2 gives up after 10.
      min_uptime: '30s',
      max_restarts: 10,
      exp_backoff_restart_delay: 2000,

      max_memory_restart: '600M',
      kill_timeout: 5000,

      time: true,
      env: {
        NODE_ENV: 'production',
        APP_URL: 'http://localhost:4001',
        PATH: '/usr/local/bin:/usr/bin:/bin:/home/ftherese/.nvm/versions/node/v22.23.1/bin',
      },
    },
  ],
};
