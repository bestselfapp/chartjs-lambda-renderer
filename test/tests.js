import { expect } from 'chai';
import sinon from 'sinon';
import { handler } from '../index.js';

describe('chartJsRenderer', () => {
    let event;

    beforeEach(() => {
        event = {
            body: JSON.stringify({
                width: 400,
                height: 400,
                backgroundColour: '#ffffff',
                configuration: {
                    type: 'bar',
                    data: {
                        labels: ['January', 'February', 'March', 'April'],
                        datasets: [{
                            label: 'Sales',
                            data: [10, 20, 30, 40]
                        }]
                    },
                    options: {}
                }
            })
        };

        process.env.LOCAL_DEBUG_OUTPUT_MODE = 'true';
    });

    it('should render a chart image successfully', async () => {
        const response = await handler(event);

        expect(response.statusCode).to.equal(200);
        expect(response.headers['Content-Type']).to.equal('image/png');
        expect(response.isBase64Encoded).to.be.true;
        expect(response.body).to.be.a('string');

        // Verify the image is more than 0 bytes
        const imageBuffer = Buffer.from(response.body, 'base64');
        expect(imageBuffer.length).to.be.greaterThan(0);
    });

    it('should throw an error if configuration is missing', async () => {
        event.body = JSON.stringify({
            width: 400,
            height: 400,
            backgroundColour: '#ffffff'
        });

        const response = await handler(event);

        expect(response.statusCode).to.equal(500);
        const body = JSON.parse(response.body);
        expect(body.error).to.equal('Configuration object is required');
    });

    afterEach(() => {
        sinon.restore();
    });
});
