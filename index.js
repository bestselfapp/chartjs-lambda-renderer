import logger from './logger.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import fs from 'fs-extra';
import path from 'path';

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

        // Deserialize and Sanitize Functions, for plugin use
        sanitizeAndDeserializeFunctions(configuration);

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
        throw new Error(err.message);
    }
}

function ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function sanitizeAndDeserializeFunctions(config) {
    // Allowed function names for Chart.js out of the box plugins
    const allowedFunctionNames = [
        'afterDraw', 
        'beforeDraw', 
        'beforeRender', 
        'afterRender',
        'beforeUpdate',
        'afterUpdate',
        'beforeDatasetDraw',
        'afterDatasetDraw',
        'beforeTooltipDraw',
        'afterTooltipDraw'
    ];

    function isFunctionString(funcStr) {
        return typeof funcStr === 'string' && (funcStr.startsWith('function') || funcStr.startsWith('('));
    }

    function sanitizeFunctionContent(funcStr) {
        // Basic regex to remove any potentially harmful code
        const forbiddenPatterns = [
            /eval\(/,            // Disallow eval()
            /Function\(/,        // Disallow Function constructor
            /while\s*\(/,        // Disallow while loops (could be used to create infinite loops)
            /for\s*\(/,          // Disallow for loops
            /setTimeout\(/,      // Disallow setTimeout (could delay execution maliciously)
            /setInterval\(/,     // Disallow setInterval (could create persistent loops)
            /require\(/          // Disallow require (could try to load modules)
        ];

        for (const pattern of forbiddenPatterns) {
            if (pattern.test(funcStr)) {
                logger.warn(`Function content rejected due to forbidden pattern: ${pattern}`);
                return null; // Reject if any forbidden pattern is found
            }
        }
        
        return funcStr;
    }

    function traverseAndDeserialize(obj) {
        for (let key in obj) {
            if (!obj.hasOwnProperty(key)) continue;

            if (isFunctionString(obj[key]) && allowedFunctionNames.includes(key)) {
                const sanitizedCode = sanitizeFunctionContent(obj[key]);
                if (sanitizedCode) {
                    try {
                        obj[key] = eval(`(${sanitizedCode})`);
                    } catch (err) {
                        logger.warn(`Failed to deserialize or sanitize function at key "${key}": ${err.message}`);
                        obj[key] = null;  // Set to null or handle error as appropriate
                    }
                } else {
                    logger.warn(`Function content at key "${key}" was rejected due to sanitization.`);
                    obj[key] = null;  // Reject the function
                }
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                traverseAndDeserialize(obj[key]);
            } else if (typeof obj[key] !== 'string' && typeof obj[key] !== 'number' && typeof obj[key] !== 'boolean') {
                // If the property is not a simple type (string, number, boolean), remove it
                logger.warn(`Unexpected property type at key "${key}". Removing property.`);
                delete obj[key];
            }
        }
    }

    traverseAndDeserialize(config);
}
