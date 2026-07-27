module.exports = {
  apps: [
    {
      name: 'office-designer',
      cwd: '/home/ftherese/office-designer',
      script: 'node_modules/.bin/next',
      args: 'start -p 4001',
      watch: false,
      env: {
        NODE_ENV: 'production',
        APP_URL: 'http://localhost:4001',
        PATH: '/usr/local/bin:/usr/bin:/bin:/home/ftherese/.nvm/versions/node/v22.18.0/bin',
      },
    },
  ],
};
