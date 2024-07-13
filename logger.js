import bunyan from 'bunyan';
import PrettyStream from 'bunyan-prettystream';

const prettyStdOut = new PrettyStream();
let stream = process.stdout;
// only when running in development, pretty up the output
if (process.stdout.isTTY) {
    stream = prettyStdOut;
    prettyStdOut.pipe(process.stdout);
}

const logger = bunyan.createLogger({
    name: 'chartJsRenderer',
    streams: [
        {
            level: process.env.LOG_LEVEL,
            stream: stream
        }
    ]
});

export default logger;
