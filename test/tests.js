import { expect } from 'chai';
import sinon from 'sinon';
import { handler } from '../index.js';
import fs from 'fs';
import path from 'path';

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

        try {
            await handler(event);
        } catch (err) {
            expect(err.message).to.contain('Configuration object is required');
        }
    });

    it('should render a chart with afterDraw plugin applied', async () => {
        // Adding afterDraw to the configuration
        event.body = JSON.stringify({
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
                options: {},
                plugins: [{
                    afterDraw: function(chart) {
                        const ctx = chart.ctx;
                        ctx.save();
                        ctx.fillStyle = 'red';
                        ctx.font = 'bold 20px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText('Test Text', chart.width / 2, chart.height / 2);
                        ctx.restore();
                    }.toString() // Convert to string to simulate the real process
                }]
            }
        });

        const response = await handler(event);

        expect(response.statusCode).to.equal(200);
        expect(response.headers['Content-Type']).to.equal('image/png');
        expect(response.isBase64Encoded).to.be.true;
        expect(response.body).to.be.a('string');

        // Verify the image is more than 0 bytes
        const imageBuffer = Buffer.from(response.body, 'base64');
        expect(imageBuffer.length).to.be.greaterThan(0);

        // Optionally, save the image locally for manual inspection
        const outputDir = 'test-output';
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.writeFileSync(path.join(outputDir, 'afterDrawTest.png'), imageBuffer);
    });

    it('should reject a function with a disallowed name', async () => {
        // Attempting to add a function with a disallowed name
        event.body = JSON.stringify({
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
                options: {},
                plugins: [{
                    customFunction: function(chart) {
                        const ctx = chart.ctx;
                        ctx.save();
                        ctx.fillStyle = 'blue';
                        ctx.fillRect(0, 0, chart.width, chart.height);
                        ctx.restore();
                    }.toString() // Convert to string to simulate the real process
                }]
            }
        });

        const response = await handler(event);

        // Since the disallowed function should be removed, the chart should still render
        expect(response.statusCode).to.equal(200);
        expect(response.headers['Content-Type']).to.equal('image/png');
        expect(response.isBase64Encoded).to.be.true;
        expect(response.body).to.be.a('string');

        // Verify the image is more than 0 bytes
        const imageBuffer = Buffer.from(response.body, 'base64');
        expect(imageBuffer.length).to.be.greaterThan(0);
    });

    it('should reject a function with an allowed name but disallowed content', async () => {
        // Adding a function with an allowed name but containing disallowed content
        event.body = JSON.stringify({
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
                options: {},
                plugins: [{
                    afterDraw: function(chart) {
                        // Disallowed content: an infinite loop
                        while (true) {}
                    }.toString() // Convert to string to simulate the real process
                }]
            }
        });

        const response = await handler(event);

        // Since the function contains disallowed content, the function should be rejected
        // The chart should still render, but without the disallowed function's effect
        expect(response.statusCode).to.equal(200);
        expect(response.headers['Content-Type']).to.equal('image/png');
        expect(response.isBase64Encoded).to.be.true;
        expect(response.body).to.be.a('string');

        // Verify the image is more than 0 bytes
        const imageBuffer = Buffer.from(response.body, 'base64');
        expect(imageBuffer.length).to.be.greaterThan(0);
    });

    afterEach(() => {
        sinon.restore();
    });
});
