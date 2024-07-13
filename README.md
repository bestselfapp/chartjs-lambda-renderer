# ChartJs Lambda Renderer

Chartjs-lambda-renderer is a standalone AWS Lambda function designed to render Chart.js charts as images. Running Chart.js on a server with Node.js can involve dependencies that are tricky to install within Lambda’s environment. By using a Docker image, this package simplifies the process, providing a reliable and isolated service for generating chart images. This separation ensures that the complexities of Chart.js and its dependencies do not interfere with other dependencies in your functions that need to render ChartJS charts.
