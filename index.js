import logger from './logger.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import fs from 'fs-extra';
import path from 'path';

const afterDrawPlugin = {
    id: 'afterDrawPlugin',
    afterDraw: (chart) => {
        // This space is intentionally left blank to allow custom afterDraw logic from the payload
    }
};

export async function handler(event) {
    logger.debug(`Starting ChartJs Renderer with event: ${JSON.stringify(event)}`);

    try {
        // Parse the event body if it exists
        const body = event.body ? JSON.parse(event.body) : event;
        logger.debug(`Parsed body: ${JSON.stringify(body)}`);

        const width = body.width || 300;
        const height = body.height || 300;
        const backgroundColour = body.backgroundColour || 'transparent';
        const configuration = body.configuration;

        if (!configuration) {
            const errMsg = 'Configuration object is required';
            logger.error(errMsg, { event });
            throw new Error(errMsg);
        }

        logger.trace(`Configuration: ${JSON.stringify(configuration)}`);

        // Add the afterDraw plugin to the configuration
        configuration.plugins = configuration.plugins || [];
        configuration.plugins.push(afterDrawPlugin);

        // Initialize ChartJSNodeCanvas
        const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
            width, 
            height, 
            backgroundColour 
        });

        // Render the chart to a buffer
        const image = await chartJSNodeCanvas.renderToBuffer(configuration);

        // Log a warning if LOCAL_DEBUG_OUTPUT_MODE is enabled
        if (process.env.LOCAL_DEBUG_OUTPUT_MODE === 'true') {
            logger.warn('LOCAL_DEBUG_OUTPUT_MODE is enabled, will ONLY write to local file system!');
            const basePath = path.resolve('local');
            ensureDirectoryExists(basePath);
            fs.writeFileSync(path.join(basePath, 'chart.png'), image);
        }
        
        logger.debug('Chart image rendered successfully');
        // Return the image as a base64 encoded string
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'image/png',
            },
            body: image.toString('base64'),
            isBase64Encoded: true,
        };
    } catch (err) {
        logger.error(`chartJsRenderer - Error: ${err.stack}`, { event });
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message }),
        };
    }
}

function ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}