module.exports = {
  apps: [
    {
      name: 'bugtracking-backend',
      script: './server.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '../logs/error.log',
      out_file: '../logs/out.log',
      time: true
    }
  ]
};